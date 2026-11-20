from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.academics.models import ClassEnrollment
from apps.accounts.models import Student

from .models import (
    Invoice,
    Payment,
    PaymentAttempt,
    Receipt,
    ReconciliationIssue,
    ReconciliationRun,
    Refund,
    StudentAccessRestriction,
)
from .services import issue_manual_invoice, normalize_mpesa_phone


class InvoiceSerializer(serializers.ModelSerializer):
    student_id = serializers.PrimaryKeyRelatedField(
        source="student",
        queryset=Student.objects.filter(status=Student.Status.ACTIVE),
        write_only=True,
    )
    enrollment_id = serializers.PrimaryKeyRelatedField(
        source="enrollment",
        queryset=ClassEnrollment.objects.filter(status=ClassEnrollment.Status.ACTIVE),
        write_only=True,
        required=False,
        allow_null=True,
    )
    student = serializers.SerializerMethodField()
    class_name = serializers.CharField(source="enrollment.class_group.name", read_only=True)
    amount_due = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    pending_prompt = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = (
            "id",
            "number",
            "student_id",
            "student",
            "enrollment_id",
            "class_name",
            "description",
            "currency",
            "total_amount",
            "amount_paid",
            "amount_due",
            "status",
            "issued_at",
            "due_date",
            "pending_prompt",
            "created_at",
        )
        read_only_fields = (
            "id",
            "number",
            "currency",
            "amount_paid",
            "status",
            "issued_at",
            "created_at",
        )

    @extend_schema_field(serializers.DictField())
    def get_student(self, obj):
        return {"id": obj.student_id, "name": str(obj.student)}

    @extend_schema_field(serializers.DictField(allow_null=True))
    def get_pending_prompt(self, obj):
        """An M-Pesa prompt still within its timeout, so the UI can say "check your phone"."""
        cutoff = timezone.now() - timedelta(seconds=settings.PAYMENT_PROMPT_TIMEOUT_SECONDS)
        attempt = (
            obj.attempts.filter(status=PaymentAttempt.Status.PENDING, created_at__gte=cutoff)
            .order_by("-created_at")
            .first()
        )
        if attempt is None:
            return None
        return {"id": str(attempt.id), "created_at": attempt.created_at}

    def validate_due_date(self, value):
        if value < timezone.localdate():
            raise serializers.ValidationError("The due date cannot be in the past.")
        return value

    def create(self, validated_data):
        return issue_manual_invoice(actor=self.context["request"].user, **validated_data)


class StkPushSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=32)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)

    def validate_phone_number(self, value):
        return normalize_mpesa_phone(value)


class PaymentAttemptSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source="invoice.number", read_only=True)

    class Meta:
        model = PaymentAttempt
        fields = (
            "id",
            "invoice",
            "invoice_number",
            "provider",
            "external_reference",
            "phone_number",
            "requested_amount",
            "status",
            "merchant_request_id",
            "checkout_request_id",
            "result_code",
            "result_description",
            "completed_at",
            "created_at",
        )


class MockPaymentDecisionSerializer(serializers.Serializer):
    outcome = serializers.ChoiceField(choices=("SUCCESS", "CANCELLED"))


class ManualPaymentRecordSerializer(serializers.Serializer):
    method = serializers.ChoiceField(choices=("CASH", "BANK"))
    amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0.01"),
    )
    reference = serializers.CharField(max_length=64, required=False, allow_blank=True)
    note = serializers.CharField(max_length=500, required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs["method"] == "BANK" and not attrs.get("reference", "").strip():
            raise serializers.ValidationError(
                {"reference": "Enter the bank transaction reference."}
            )
        return attrs


class ReceiptSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source="payment.attempt.invoice.number", read_only=True)
    student_name = serializers.CharField(
        source="payment.attempt.invoice.student.__str__",
        read_only=True,
    )
    amount = serializers.DecimalField(source="payment.amount", max_digits=12, decimal_places=2)
    currency = serializers.CharField(source="payment.currency")
    provider_reference = serializers.CharField(source="payment.provider_reference")
    paid_at = serializers.DateTimeField(source="payment.paid_at")
    method = serializers.CharField(source="payment.method", read_only=True)

    class Meta:
        model = Receipt
        fields = (
            "id",
            "number",
            "invoice_number",
            "student_name",
            "amount",
            "currency",
            "provider_reference",
            "paid_at",
            "method",
            "issued_at",
        )


class PaymentSerializer(serializers.ModelSerializer):
    invoice = InvoiceSerializer(source="attempt.invoice", read_only=True)
    provider = serializers.CharField(source="attempt.provider", read_only=True)
    receipt_number = serializers.CharField(source="receipt.number", read_only=True, default=None)
    refundable_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Payment
        fields = (
            "id",
            "invoice",
            "provider",
            "method",
            "provider_reference",
            "amount",
            "amount_refunded",
            "refundable_amount",
            "currency",
            "phone_number",
            "recording_note",
            "status",
            "paid_at",
            "receipt_number",
        )


class RefundCreateSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    reason = serializers.CharField(max_length=500)
    # True when the money was already returned outside the app (e.g. in the PayHero
    # portal); we only record it so the ledger and invoice stay correct.
    record_only = serializers.BooleanField(default=False)


class RefundSerializer(serializers.ModelSerializer):
    payment_reference = serializers.CharField(source="payment.provider_reference", read_only=True)
    invoice_number = serializers.CharField(source="payment.attempt.invoice.number", read_only=True)

    class Meta:
        model = Refund
        fields = (
            "id",
            "payment",
            "payment_reference",
            "invoice_number",
            "amount",
            "reason",
            "status",
            "provider_reference",
            "processed_at",
            "created_at",
        )


class RestrictionSerializer(serializers.ModelSerializer):
    student_id = serializers.PrimaryKeyRelatedField(
        source="student",
        queryset=Student.objects.filter(status=Student.Status.ACTIVE),
        write_only=True,
    )
    student = serializers.SerializerMethodField()

    class Meta:
        model = StudentAccessRestriction
        fields = (
            "id",
            "student_id",
            "student",
            "scope",
            "reason",
            "note",
            "status",
            "restricted_from",
            "restricted_until",
            "lifted_at",
            "created_at",
        )
        read_only_fields = (
            "id",
            "status",
            "restricted_from",
            "lifted_at",
            "created_at",
        )

    @extend_schema_field(serializers.DictField())
    def get_student(self, obj):
        return {"id": obj.student_id, "name": str(obj.student)}

    def validate_restricted_until(self, value):
        if value and value <= timezone.now():
            raise serializers.ValidationError("The restriction end must be in the future.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        student = validated_data["student"]
        scope = validated_data.get("scope", StudentAccessRestriction.Scope.CLASS_ACCESS)
        validated_data["scope"] = scope
        existing = StudentAccessRestriction.objects.select_for_update().filter(
            student=student,
            scope=scope,
            status=StudentAccessRestriction.Status.ACTIVE,
        )
        expired = existing.filter(restricted_until__lte=timezone.now())
        expired.update(
            status=StudentAccessRestriction.Status.LIFTED,
            lifted_at=timezone.now(),
        )
        if (
            existing.filter(restricted_until__isnull=True).exists()
            or existing.filter(restricted_until__gt=timezone.now()).exists()
        ):
            raise serializers.ValidationError(
                {"scope": "This student already has an active restriction for this scope."}
            )
        return StudentAccessRestriction.objects.create(
            created_by=self.context["request"].user,
            **validated_data,
        )


class ReconciliationIssueSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source="invoice.number", read_only=True, default=None)

    class Meta:
        model = ReconciliationIssue
        fields = (
            "id",
            "kind",
            "invoice_number",
            "expected_value",
            "actual_value",
            "detail",
            "resolution_note",
            "resolved_at",
            "resolved_by",
        )


class ReconciliationResolutionSerializer(serializers.Serializer):
    resolution_note = serializers.CharField(max_length=500)


class ReconciliationRunSerializer(serializers.ModelSerializer):
    issues = ReconciliationIssueSerializer(many=True, read_only=True)

    class Meta:
        model = ReconciliationRun
        fields = (
            "id",
            "status",
            "started_at",
            "completed_at",
            "checked_count",
            "issue_count",
            "notes",
            "issues",
        )
