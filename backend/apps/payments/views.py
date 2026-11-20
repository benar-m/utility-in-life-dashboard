import secrets
from datetime import date

from django.conf import settings
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.accounts.permissions import IsOwnerOrAdmin

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
from .serializers import (
    InvoiceSerializer,
    ManualPaymentRecordSerializer,
    MockPaymentDecisionSerializer,
    PaymentAttemptSerializer,
    PaymentSerializer,
    ReceiptSerializer,
    ReconciliationIssueSerializer,
    ReconciliationResolutionSerializer,
    ReconciliationRunSerializer,
    RefundCreateSerializer,
    RefundSerializer,
    RestrictionSerializer,
    StkPushSerializer,
)
from .services import (
    apply_overdue_restrictions,
    expire_stale_attempts,
    generate_class_invoices,
    initiate_stk_push,
    mock_callback_payload,
    process_mpesa_callback,
    process_payhero_callback,
    record_manual_payment,
    refund_payment,
    run_reconciliation,
    sync_enrollment_balance,
)


def is_admin(user):
    return getattr(user, "role", None) in {User.Role.OWNER, User.Role.ADMIN}


class StudentScopedViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    student_lookup = "attempt__invoice__student"

    def scope_queryset(self, queryset):
        user = self.request.user
        if is_admin(user):
            return queryset
        if user.role == User.Role.STUDENT and hasattr(user, "student_profile"):
            return queryset.filter(**{self.student_lookup: user.student_profile})
        return queryset.none()


class InvoiceViewSet(viewsets.ModelViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]
    filterset_fields = ("status", "student", "enrollment")
    search_fields = ("number", "student__first_name", "student__last_name", "description")
    ordering_fields = ("issued_at", "due_date", "total_amount")
    ordering = ("-issued_at",)
    queryset = Invoice.objects.none()

    def get_queryset(self):
        queryset = Invoice.objects.select_related(
            "student", "enrollment__class_group", "created_by"
        )
        user = self.request.user
        if is_admin(user):
            return queryset
        if user.role == User.Role.STUDENT and hasattr(user, "student_profile"):
            return queryset.filter(student=user.student_profile)
        return queryset.none()

    def create(self, request, *args, **kwargs):
        if not is_admin(request.user):
            return Response(status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)

    @extend_schema(request=StkPushSerializer, responses=PaymentAttemptSerializer)
    @action(detail=True, methods=["post"])
    def pay(self, request, pk=None):
        invoice = self.get_object()
        serializer = StkPushSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        amount = serializer.validated_data.get("amount", invoice.amount_due)
        attempt, customer_message = initiate_stk_push(
            invoice=invoice,
            phone_number=serializer.validated_data["phone_number"],
            amount=amount,
            actor=request.user,
        )
        payload = PaymentAttemptSerializer(attempt).data
        payload["customer_message"] = customer_message
        payload["mock_mode"] = attempt.provider == PaymentAttempt.Provider.MOCK
        return Response(payload, status=status.HTTP_201_CREATED)

    @extend_schema(request=ManualPaymentRecordSerializer, responses=PaymentSerializer)
    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsOwnerOrAdmin],
        url_path="record",
    )
    def record(self, request, pk=None):
        invoice = self.get_object()
        serializer = ManualPaymentRecordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment = record_manual_payment(
            invoice=invoice,
            actor=request.user,
            **serializer.validated_data,
        )
        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)

    @extend_schema(request=None, responses=InvoiceSerializer)
    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsOwnerOrAdmin],
    )
    @transaction.atomic
    def void(self, request, pk=None):
        invoice = Invoice.objects.select_for_update().get(pk=self.get_object().pk)
        if invoice.amount_paid > 0:
            return Response(
                {"detail": "Refund successful payments before voiding this invoice."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        invoice.status = Invoice.Status.VOID
        invoice.save(update_fields=("status", "updated_at"))
        sync_enrollment_balance(invoice.enrollment)
        return Response(self.get_serializer(invoice).data)

    @extend_schema(
        request=inline_serializer(
            name="GenerateInvoicesRequest",
            fields={"due_date": serializers.DateField(required=False)},
        ),
        responses=inline_serializer(
            name="GenerateInvoicesResponse",
            fields={
                "created": serializers.IntegerField(),
                "updated": serializers.IntegerField(),
                "checked": serializers.IntegerField(),
            },
        ),
    )
    @action(
        detail=False,
        methods=["post"],
        permission_classes=[IsOwnerOrAdmin],
    )
    def generate(self, request):
        due_date = request.data.get("due_date")
        if due_date:
            try:
                due_date = date.fromisoformat(due_date)
            except ValueError:
                return Response(
                    {"due_date": ["Use YYYY-MM-DD."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        return Response(generate_class_invoices(actor=request.user, due_date=due_date))


class PaymentAttemptViewSet(StudentScopedViewSet):
    serializer_class = PaymentAttemptSerializer
    filterset_fields = ("status", "invoice")
    queryset = PaymentAttempt.objects.select_related("invoice__student")
    student_lookup = "invoice__student"

    def get_queryset(self):
        return self.scope_queryset(self.queryset)

    def retrieve(self, request, *args, **kwargs):
        # Polled by the payment dialog: report a timed-out prompt instead of "pending" forever.
        attempt = self.get_object()
        expire_stale_attempts(attempt.invoice)
        attempt.refresh_from_db()
        return Response(self.get_serializer(attempt).data)

    @extend_schema(request=MockPaymentDecisionSerializer, responses=PaymentAttemptSerializer)
    @action(detail=True, methods=["post"])
    def simulate(self, request, pk=None):
        attempt = self.get_object()
        if settings.PAYMENT_GATEWAY != "mock" or attempt.provider != PaymentAttempt.Provider.MOCK:
            return Response(
                {"detail": "Payment simulation is disabled when PayHero is selected."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = MockPaymentDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if attempt.status != PaymentAttempt.Status.PENDING:
            return Response(
                {"detail": "This payment prompt has already completed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        payload = mock_callback_payload(
            attempt,
            succeed=serializer.validated_data["outcome"] == "SUCCESS",
        )
        attempt = process_mpesa_callback(payload)
        return Response(PaymentAttemptSerializer(attempt).data)


class PaymentViewSet(StudentScopedViewSet):
    serializer_class = PaymentSerializer
    filterset_fields = ("status",)
    queryset = Payment.objects.select_related(
        "attempt__invoice__student",
        "attempt__invoice__enrollment__class_group",
        "receipt",
    )

    def get_queryset(self):
        return self.scope_queryset(self.queryset)

    @extend_schema(request=RefundCreateSerializer, responses=RefundSerializer)
    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsOwnerOrAdmin],
    )
    def refund(self, request, pk=None):
        serializer = RefundCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        refund = refund_payment(
            payment=self.get_object(),
            amount=serializer.validated_data["amount"],
            reason=serializer.validated_data["reason"],
            actor=request.user,
            record_only=serializer.validated_data["record_only"],
        )
        return Response(RefundSerializer(refund).data, status=status.HTTP_201_CREATED)


class ReceiptViewSet(StudentScopedViewSet):
    serializer_class = ReceiptSerializer
    queryset = Receipt.objects.select_related("payment__attempt__invoice__student")
    student_lookup = "payment__attempt__invoice__student"

    def get_queryset(self):
        return self.scope_queryset(self.queryset)


class RefundViewSet(StudentScopedViewSet):
    serializer_class = RefundSerializer
    queryset = Refund.objects.select_related("payment__attempt__invoice__student")
    student_lookup = "payment__attempt__invoice__student"

    def get_queryset(self):
        return self.scope_queryset(self.queryset)


class RestrictionViewSet(viewsets.ModelViewSet):
    serializer_class = RestrictionSerializer
    permission_classes = [IsOwnerOrAdmin]
    http_method_names = ["get", "post", "head", "options"]
    filterset_fields = ("student", "status", "scope", "reason")
    queryset = StudentAccessRestriction.objects.select_related("student", "created_by", "lifted_by")

    @extend_schema(request=None, responses=RestrictionSerializer)
    @action(detail=True, methods=["post"])
    def lift(self, request, pk=None):
        restriction = self.get_object()
        if restriction.status == StudentAccessRestriction.Status.ACTIVE:
            restriction.status = StudentAccessRestriction.Status.LIFTED
            restriction.lifted_at = timezone.now()
            restriction.lifted_by = request.user
            restriction.save(update_fields=("status", "lifted_at", "lifted_by"))
        return Response(self.get_serializer(restriction).data)

    @extend_schema(request=None)
    @action(detail=False, methods=["post"], url_path="apply-overdue")
    def apply_overdue(self, request):
        return Response(apply_overdue_restrictions(actor=request.user))


class ReconciliationRunViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ReconciliationRunSerializer
    permission_classes = [IsOwnerOrAdmin]
    queryset = ReconciliationRun.objects.prefetch_related("issues__invoice")

    @extend_schema(request=None, responses=ReconciliationRunSerializer)
    def create(self, request, *args, **kwargs):
        run = run_reconciliation(actor=request.user)
        return Response(self.get_serializer(run).data, status=status.HTTP_201_CREATED)


class ReconciliationIssueViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ReconciliationIssueSerializer
    permission_classes = [IsOwnerOrAdmin]
    filterset_fields = ("run", "kind", "resolved_at")
    queryset = ReconciliationIssue.objects.select_related("invoice", "resolved_by")

    @extend_schema(
        request=ReconciliationResolutionSerializer,
        responses=ReconciliationIssueSerializer,
    )
    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        issue = self.get_object()
        serializer = ReconciliationResolutionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        issue.resolution_note = serializer.validated_data["resolution_note"]
        issue.resolved_at = timezone.now()
        issue.resolved_by = request.user
        issue.save(update_fields=("resolution_note", "resolved_at", "resolved_by"))
        return Response(self.get_serializer(issue).data)


class PaymentSummaryView(APIView):
    permission_classes = [IsOwnerOrAdmin]

    @extend_schema(
        responses=inline_serializer(
            name="PaymentSummary",
            fields={
                "collected_this_month": serializers.DecimalField(max_digits=12, decimal_places=2),
                "pending_invoices": serializers.IntegerField(),
                "overdue_invoices": serializers.IntegerField(),
                "failed_attempts": serializers.IntegerField(),
                "successful_payments": serializers.IntegerField(),
                "refunds": serializers.IntegerField(),
                "active_restrictions": serializers.IntegerField(),
            },
        )
    )
    def get(self, request):
        today = timezone.localdate()
        month_payments = Payment.objects.filter(
            paid_at__year=today.year,
            paid_at__month=today.month,
        )
        totals = month_payments.aggregate(
            collected=Sum("amount"),
            refunded=Sum("amount_refunded"),
        )
        collected = totals["collected"] or 0
        refunded = totals["refunded"] or 0
        return Response(
            {
                "collected_this_month": collected - refunded,
                "pending_invoices": Invoice.objects.filter(
                    status__in=(
                        Invoice.Status.ISSUED,
                        Invoice.Status.PARTIALLY_PAID,
                        Invoice.Status.OVERDUE,
                    )
                ).count(),
                "overdue_invoices": Invoice.objects.filter(status=Invoice.Status.OVERDUE).count(),
                "failed_attempts": PaymentAttempt.objects.filter(
                    status__in=(
                        PaymentAttempt.Status.FAILED,
                        PaymentAttempt.Status.CANCELLED,
                    )
                ).count(),
                "successful_payments": Payment.objects.count(),
                "refunds": Refund.objects.filter(status=Refund.Status.SUCCEEDED).count(),
                "active_restrictions": StudentAccessRestriction.objects.filter(
                    status=StudentAccessRestriction.Status.ACTIVE
                ).count(),
            }
        )


class MpesaCallbackView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        request=inline_serializer(
            name="MpesaCallbackRequest",
            fields={"Body": serializers.DictField(required=False)},
        ),
        responses=inline_serializer(
            name="MpesaCallbackResponse",
            fields={
                "ResultCode": serializers.IntegerField(),
                "ResultDesc": serializers.CharField(),
                "attempt_status": serializers.CharField(),
            },
        ),
    )
    def post(self, request):
        if settings.PAYMENT_GATEWAY != "mock":
            return Response(status=status.HTTP_404_NOT_FOUND)
        supplied_token = request.headers.get("X-Mock-Mpesa-Token", "")
        if not secrets.compare_digest(supplied_token, settings.MPESA_CALLBACK_TOKEN):
            return Response(status=status.HTTP_403_FORBIDDEN)
        attempt = process_mpesa_callback(request.data)
        return Response(
            {
                "ResultCode": 0,
                "ResultDesc": "Callback accepted",
                "attempt_status": attempt.status,
            }
        )


class PayHeroCallbackView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        request=serializers.DictField(),
        responses=inline_serializer(
            name="PayHeroCallbackResponse",
            fields={"received": serializers.BooleanField()},
        ),
    )
    def post(self, request, callback_token):
        attempt = process_payhero_callback(
            callback_token=callback_token,
            payload=request.data,
        )
        return Response({"received": True, "attempt_status": attempt.status})
