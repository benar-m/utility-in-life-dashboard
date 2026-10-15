import uuid
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator, RegexValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.accounts.models import Student


def reference_number(prefix):
    return f"{prefix}-{timezone.now():%Y%m}-{uuid.uuid4().hex[:8].upper()}"


def invoice_number():
    return reference_number("INV")


def receipt_number():
    return reference_number("RCT")


class Invoice(models.Model):
    class Status(models.TextChoices):
        ISSUED = "ISSUED", "Issued"
        PARTIALLY_PAID = "PARTIALLY_PAID", "Partially paid"
        PAID = "PAID", "Paid"
        OVERDUE = "OVERDUE", "Overdue"
        VOID = "VOID", "Void"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    number = models.CharField(max_length=32, unique=True, default=invoice_number, editable=False)
    student = models.ForeignKey(Student, on_delete=models.PROTECT, related_name="invoices")
    enrollment = models.ForeignKey(
        "academics.ClassEnrollment",
        on_delete=models.PROTECT,
        related_name="invoices",
        null=True,
        blank=True,
    )
    description = models.CharField(max_length=255)
    currency = models.CharField(
        max_length=3,
        default="KES",
        validators=[RegexValidator(r"^[A-Z]{3}$", "Use a three-letter currency code.")],
    )
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    amount_paid = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(0)],
    )
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.ISSUED)
    issued_at = models.DateTimeField(default=timezone.now)
    due_date = models.DateField()
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_invoices",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-issued_at", "-created_at")
        indexes = [
            models.Index(fields=("status", "due_date")),
            models.Index(fields=("student", "status")),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(amount_paid__lte=models.F("total_amount")),
                name="payments_invoice_paid_not_above_total",
            )
        ]

    def __str__(self):
        return self.number

    @property
    def amount_due(self):
        return max(self.total_amount - self.amount_paid, Decimal("0.00"))


class PaymentAttempt(models.Model):
    class Provider(models.TextChoices):
        MOCK = "mock", "Mock"
        PAYHERO = "payhero", "PayHero"
        MANUAL = "manual", "Manual recording"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        SUCCEEDED = "SUCCEEDED", "Succeeded"
        FAILED = "FAILED", "Failed"
        CANCELLED = "CANCELLED", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name="attempts")
    provider = models.CharField(max_length=16, choices=Provider.choices, default=Provider.MOCK)
    external_reference = models.CharField(max_length=64, unique=True)
    callback_token_hash = models.CharField(max_length=64, blank=True, default="")
    phone_number = models.CharField(max_length=15, blank=True, default="")
    requested_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    merchant_request_id = models.CharField(max_length=64, unique=True)
    checkout_request_id = models.CharField(max_length=64, unique=True)
    result_code = models.IntegerField(null=True, blank=True)
    result_description = models.CharField(max_length=255, blank=True)
    raw_request = models.JSONField(default=dict, blank=True)
    raw_callback = models.JSONField(default=dict, blank=True)
    initiated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="payment_attempts",
    )
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [models.Index(fields=("status", "created_at"))]

    def __str__(self):
        return self.checkout_request_id


class Payment(models.Model):
    class Method(models.TextChoices):
        MPESA = "MPESA", "M-Pesa"
        CASH = "CASH", "Cash"
        BANK = "BANK", "Bank transfer"

    class Status(models.TextChoices):
        SUCCEEDED = "SUCCEEDED", "Succeeded"
        PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED", "Partially refunded"
        REFUNDED = "REFUNDED", "Refunded"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    attempt = models.OneToOneField(
        PaymentAttempt,
        on_delete=models.PROTECT,
        related_name="payment",
    )
    provider_reference = models.CharField(max_length=64, unique=True)
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    amount_refunded = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(0)],
    )
    currency = models.CharField(max_length=3, default="KES")
    phone_number = models.CharField(max_length=15, blank=True, default="")
    method = models.CharField(max_length=12, choices=Method.choices, default=Method.MPESA)
    recording_note = models.CharField(max_length=500, blank=True)
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.SUCCEEDED)
    paid_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-paid_at",)
        constraints = [
            models.CheckConstraint(
                condition=Q(amount_refunded__lte=models.F("amount")),
                name="payments_refunded_not_above_payment",
            )
        ]

    def __str__(self):
        return self.provider_reference

    @property
    def refundable_amount(self):
        return max(self.amount - self.amount_refunded, Decimal("0.00"))


class Receipt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    number = models.CharField(max_length=32, unique=True, default=receipt_number, editable=False)
    payment = models.OneToOneField(Payment, on_delete=models.PROTECT, related_name="receipt")
    issued_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ("-issued_at",)

    def __str__(self):
        return self.number


class Refund(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        SUCCEEDED = "SUCCEEDED", "Succeeded"
        FAILED = "FAILED", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payment = models.ForeignKey(Payment, on_delete=models.PROTECT, related_name="refunds")
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    reason = models.CharField(max_length=500)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    provider_reference = models.CharField(max_length=64, unique=True)
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="requested_refunds",
    )
    processed_at = models.DateTimeField(null=True, blank=True)
    raw_response = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return self.provider_reference


class StudentAccessRestriction(models.Model):
    class Scope(models.TextChoices):
        CLASS_ACCESS = "CLASS_ACCESS", "Class access"
        FULL_PORTAL = "FULL_PORTAL", "Full learning portal"

    class Reason(models.TextChoices):
        OVERDUE_PAYMENT = "OVERDUE_PAYMENT", "Overdue payment"
        MANUAL = "MANUAL", "Manual restriction"

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        LIFTED = "LIFTED", "Lifted"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(Student, on_delete=models.PROTECT, related_name="restrictions")
    scope = models.CharField(max_length=24, choices=Scope.choices, default=Scope.CLASS_ACCESS)
    reason = models.CharField(max_length=24, choices=Reason.choices)
    note = models.CharField(max_length=500, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)
    restricted_from = models.DateTimeField(default=timezone.now)
    restricted_until = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_payment_restrictions",
    )
    lifted_at = models.DateTimeField(null=True, blank=True)
    lifted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="lifted_payment_restrictions",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(
                fields=("student", "scope"),
                condition=Q(status="ACTIVE"),
                name="payments_one_active_restriction_per_scope",
            )
        ]

    def __str__(self):
        return f"{self.student} - {self.get_scope_display()}"


class ReconciliationRun(models.Model):
    class Status(models.TextChoices):
        RUNNING = "RUNNING", "Running"
        COMPLETED = "COMPLETED", "Completed"
        FAILED = "FAILED", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.RUNNING)
    started_at = models.DateTimeField(default=timezone.now)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="reconciliation_runs",
    )
    checked_count = models.PositiveIntegerField(default=0)
    issue_count = models.PositiveIntegerField(default=0)
    notes = models.CharField(max_length=500, blank=True)

    class Meta:
        ordering = ("-started_at",)

    def __str__(self):
        return f"Reconciliation {self.started_at:%Y-%m-%d %H:%M}"


class ReconciliationIssue(models.Model):
    class Kind(models.TextChoices):
        MISSING_PAYMENT = "MISSING_PAYMENT", "Successful attempt without payment"
        MISSING_RECEIPT = "MISSING_RECEIPT", "Payment without receipt"
        INVOICE_MISMATCH = "INVOICE_MISMATCH", "Invoice balance mismatch"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    run = models.ForeignKey(ReconciliationRun, on_delete=models.CASCADE, related_name="issues")
    kind = models.CharField(max_length=32, choices=Kind.choices)
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="reconciliation_issues",
    )
    attempt = models.ForeignKey(
        PaymentAttempt,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="reconciliation_issues",
    )
    payment = models.ForeignKey(
        Payment,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="reconciliation_issues",
    )
    expected_value = models.CharField(max_length=100, blank=True)
    actual_value = models.CharField(max_length=100, blank=True)
    detail = models.CharField(max_length=500)
    resolution_note = models.CharField(max_length=500, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="resolved_reconciliation_issues",
    )

    class Meta:
        ordering = ("kind", "id")

    def __str__(self):
        return f"{self.get_kind_display()}: {self.detail}"
