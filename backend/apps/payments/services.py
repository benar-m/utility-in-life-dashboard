import hashlib
import secrets
import uuid
from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers

from apps.academics.models import ClassEnrollment

from .gateways import PaymentGatewayError, get_gateway
from .models import (
    Invoice,
    Payment,
    PaymentAttempt,
    Receipt,
    ReconciliationIssue,
    ReconciliationRun,
    Refund,
    StudentAccessRestriction,
    reference_number,
)

# result_code stored on attempts we gave up waiting for. A late callback for such an
# attempt is still honoured, so money taken by M-Pesa is never left unrecorded.
PROMPT_TIMEOUT_RESULT_CODE = -1


def expire_stale_attempts(invoice):
    cutoff = timezone.now() - timedelta(seconds=settings.PAYMENT_PROMPT_TIMEOUT_SECONDS)
    return invoice.attempts.filter(
        status=PaymentAttempt.Status.PENDING,
        provider__in=(PaymentAttempt.Provider.MOCK, PaymentAttempt.Provider.PAYHERO),
        created_at__lt=cutoff,
    ).update(
        status=PaymentAttempt.Status.FAILED,
        result_code=PROMPT_TIMEOUT_RESULT_CODE,
        result_description="No response from M-Pesa in time. You can send a new prompt.",
        completed_at=timezone.now(),
    )


def accepts_callback(attempt):
    return attempt.status == PaymentAttempt.Status.PENDING or (
        attempt.status == PaymentAttempt.Status.FAILED
        and attempt.result_code == PROMPT_TIMEOUT_RESULT_CODE
    )


def normalize_mpesa_phone(value):
    digits = "".join(character for character in str(value) if character.isdigit())
    if digits.startswith("0") and len(digits) == 10:
        digits = f"254{digits[1:]}"
    elif digits.startswith("7") and len(digits) == 9:
        digits = f"254{digits}"
    if len(digits) != 12 or not digits.startswith("254"):
        raise serializers.ValidationError(
            {"phone_number": "Use a valid Kenyan M-Pesa number, for example 0712345678."}
        )
    return digits


def invoice_status(invoice):
    if invoice.status == Invoice.Status.VOID:
        return Invoice.Status.VOID
    if invoice.amount_due == 0:
        return Invoice.Status.PAID
    if invoice.due_date < timezone.localdate():
        return Invoice.Status.OVERDUE
    if invoice.amount_paid > 0:
        return Invoice.Status.PARTIALLY_PAID
    return Invoice.Status.ISSUED


def sync_enrollment_balance(enrollment):
    if enrollment is None:
        return
    invoices = enrollment.invoices.exclude(status=Invoice.Status.VOID)
    balance = sum((invoice.amount_due for invoice in invoices), Decimal("0.00"))
    if invoices.exists():
        enrollment.balance_due = balance
        enrollment.financial_status = (
            ClassEnrollment.FinancialStatus.CLEARED
            if balance == 0
            else ClassEnrollment.FinancialStatus.PENDING
        )
        enrollment.save(update_fields=("balance_due", "financial_status"))


def refresh_invoice(invoice):
    next_status = invoice_status(invoice)
    if invoice.status != next_status:
        invoice.status = next_status
        invoice.save(update_fields=("status", "updated_at"))
    sync_enrollment_balance(invoice.enrollment)
    return invoice


@transaction.atomic
def ensure_invoice_for_enrollment(enrollment, *, actor, due_date=None):
    class_group = enrollment.class_group
    if class_group.cost_amount is None or class_group.cost_amount <= 0:
        return None, False
    due_date = due_date or timezone.localdate() + timedelta(days=settings.PAYMENT_DEFAULT_DUE_DAYS)
    open_invoice = (
        enrollment.invoices.select_for_update()
        .filter(
            status__in=(
                Invoice.Status.ISSUED,
                Invoice.Status.PARTIALLY_PAID,
                Invoice.Status.OVERDUE,
            ),
            amount_paid__lt=models_f("total_amount"),
        )
        .first()
    )
    if open_invoice:
        if open_invoice.amount_paid == 0:
            open_invoice.total_amount = class_group.cost_amount
            open_invoice.currency = class_group.currency
            open_invoice.description = f"{class_group.name} class fee"
            open_invoice.due_date = due_date
            open_invoice.save(
                update_fields=(
                    "total_amount",
                    "currency",
                    "description",
                    "due_date",
                    "updated_at",
                )
            )
        refresh_invoice(open_invoice)
        return open_invoice, False
    if enrollment.invoices.filter(status=Invoice.Status.PAID).exists():
        return None, False
    invoice = Invoice.objects.create(
        student=enrollment.student,
        enrollment=enrollment,
        description=f"{class_group.name} class fee",
        currency=class_group.currency,
        total_amount=class_group.cost_amount,
        due_date=due_date,
        created_by=actor,
    )
    refresh_invoice(invoice)
    return invoice, True


@transaction.atomic
def issue_manual_invoice(*, student, total_amount, description, due_date, actor, enrollment=None):
    if enrollment and enrollment.student_id != student.pk:
        raise serializers.ValidationError(
            {"enrollment_id": "The enrollment does not belong to this student."}
        )
    invoice = Invoice.objects.create(
        student=student,
        enrollment=enrollment,
        description=description,
        total_amount=total_amount,
        currency=enrollment.class_group.currency if enrollment else "KES",
        due_date=due_date,
        created_by=actor,
    )
    refresh_invoice(invoice)
    return invoice


@transaction.atomic
def record_manual_payment(*, invoice, amount, method, reference="", note="", actor):
    invoice = Invoice.objects.select_for_update().select_related("student").get(pk=invoice.pk)
    refresh_invoice(invoice)
    if invoice.status == Invoice.Status.VOID:
        raise serializers.ValidationError("A void invoice cannot accept a payment.")
    if invoice.amount_due <= 0:
        raise serializers.ValidationError("This invoice is already paid.")
    expire_stale_attempts(invoice)
    if invoice.attempts.filter(status=PaymentAttempt.Status.PENDING).exists():
        raise serializers.ValidationError(
            "An M-Pesa prompt is still pending. Wait for it to finish before recording "
            "an offline payment."
        )
    if not amount.is_finite() or amount <= 0:
        raise serializers.ValidationError({"amount": "Enter a positive payment amount."})
    if amount > invoice.amount_due:
        raise serializers.ValidationError(
            {"amount": f"Amount cannot exceed the invoice balance of {invoice.amount_due}."}
        )

    provider_reference = reference.strip().upper()
    if provider_reference:
        if Payment.objects.filter(provider_reference__iexact=provider_reference).exists():
            raise serializers.ValidationError(
                {"reference": "A payment with this reference has already been recorded."}
            )
    else:
        provider_reference = f"{method}-{uuid.uuid4().hex[:12].upper()}"

    recorded_at = timezone.now()
    attempt_id = uuid.uuid4().hex.upper()
    attempt = PaymentAttempt.objects.create(
        invoice=invoice,
        provider=PaymentAttempt.Provider.MANUAL,
        external_reference=f"UIL-MANUAL-{attempt_id}",
        phone_number="",
        requested_amount=amount,
        status=PaymentAttempt.Status.SUCCEEDED,
        merchant_request_id=f"MANUAL-MERCHANT-{attempt_id}",
        checkout_request_id=f"MANUAL-CHECKOUT-{attempt_id}",
        initiated_by=actor,
        completed_at=recorded_at,
    )
    payment = Payment.objects.create(
        attempt=attempt,
        provider_reference=provider_reference,
        amount=amount,
        currency=invoice.currency,
        phone_number="",
        method=method,
        recording_note=note.strip(),
        paid_at=recorded_at,
    )
    Receipt.objects.create(payment=payment)
    invoice.amount_paid += amount
    invoice.save(update_fields=("amount_paid", "updated_at"))
    refresh_invoice(invoice)
    lift_resolved_overdue_restrictions(invoice.student)
    return payment


def generate_class_invoices(*, actor, due_date=None):
    enrollments = ClassEnrollment.objects.select_related("class_group", "student").filter(
        status=ClassEnrollment.Status.ACTIVE,
        class_group__cost_amount__isnull=False,
    )
    created = 0
    updated = 0
    for enrollment in enrollments:
        invoice, was_created = ensure_invoice_for_enrollment(
            enrollment,
            actor=actor,
            due_date=due_date,
        )
        if invoice:
            created += int(was_created)
            updated += int(not was_created)
    return {"created": created, "updated": updated, "checked": enrollments.count()}


def initiate_stk_push(*, invoice, phone_number, amount, actor):
    phone_number = normalize_mpesa_phone(phone_number)
    gateway = get_gateway()
    callback_token = secrets.token_urlsafe(32) if gateway.name == "payhero" else ""
    external_reference = f"UIL-{uuid.uuid4().hex.upper()}"

    with transaction.atomic():
        invoice = Invoice.objects.select_for_update().get(pk=invoice.pk)
        refresh_invoice(invoice)
        if invoice.status == Invoice.Status.VOID:
            raise serializers.ValidationError("A void invoice cannot be paid.")
        if invoice.amount_due == 0:
            raise serializers.ValidationError("This invoice is already paid.")
        if amount > invoice.amount_due:
            raise serializers.ValidationError(
                {"amount": f"Amount cannot exceed the invoice balance of {invoice.amount_due}."}
            )
        expire_stale_attempts(invoice)
        if invoice.attempts.filter(status=PaymentAttempt.Status.PENDING).exists():
            raise serializers.ValidationError(
                "A payment prompt was just sent for this invoice. Check your phone, or try "
                "again in a few minutes."
            )
        if gateway.name == "payhero" and invoice.currency != "KES":
            raise serializers.ValidationError(
                "PayHero M-Pesa prompts are only available for KES invoices."
            )

        attempt = PaymentAttempt.objects.create(
            invoice=invoice,
            provider=gateway.name,
            external_reference=external_reference,
            callback_token_hash=(
                hashlib.sha256(callback_token.encode()).hexdigest() if callback_token else ""
            ),
            phone_number=phone_number,
            requested_amount=amount,
            merchant_request_id=f"PENDING-{uuid.uuid4().hex}",
            checkout_request_id=f"PENDING-{uuid.uuid4().hex}",
            initiated_by=actor,
        )

    callback_url = ""
    if callback_token:
        callback_url = (
            f"{settings.PAYHERO_CALLBACK_BASE_URL.rstrip('/')}/{callback_token}/"
            if settings.PAYHERO_CALLBACK_BASE_URL
            else ""
        )
    try:
        response = gateway.initiate_stk_push(
            phone_number=phone_number,
            amount=amount,
            account_reference=invoice.number,
            description=invoice.description,
            external_reference=external_reference,
            customer_name=str(invoice.student),
            callback_url=callback_url,
        )
    except PaymentGatewayError as exc:
        attempt.status = PaymentAttempt.Status.FAILED
        attempt.result_code = 1
        attempt.result_description = str(exc)[:255]
        attempt.completed_at = timezone.now()
        attempt.save(update_fields=("status", "result_code", "result_description", "completed_at"))
        raise serializers.ValidationError(str(exc)) from exc

    attempt.merchant_request_id = response.merchant_request_id
    attempt.checkout_request_id = response.checkout_request_id
    attempt.raw_request = response.raw_response
    attempt.save(update_fields=("merchant_request_id", "checkout_request_id", "raw_request"))
    return attempt, response.customer_message


def callback_metadata(payload):
    callback = payload.get("Body", {}).get("stkCallback", payload)
    items = callback.get("CallbackMetadata", {}).get("Item", [])
    metadata = {item.get("Name"): item.get("Value") for item in items if item.get("Name")}
    return callback, metadata


def callback_datetime(value):
    if not value:
        return timezone.now()
    try:
        parsed = datetime.strptime(str(value), "%Y%m%d%H%M%S")
    except ValueError:
        return timezone.now()
    return timezone.make_aware(parsed, timezone.get_current_timezone())


def _record_successful_payment(
    *, attempt, paid_amount, provider_reference, phone_number, transaction_date, payload
):
    # Callers have already checked the attempt accepts this callback (and may have
    # overwritten result_code); here we only guard against recording money twice.
    if attempt.status == PaymentAttempt.Status.SUCCEEDED:
        return attempt
    invoice = Invoice.objects.select_for_update().get(pk=attempt.invoice_id)
    refresh_invoice(invoice)
    if (
        not paid_amount.is_finite()
        or paid_amount <= 0
        or paid_amount != attempt.requested_amount
        or paid_amount > invoice.amount_due
        or not provider_reference.strip()
    ):
        attempt.status = PaymentAttempt.Status.FAILED
        attempt.result_description = "Callback amount does not match the payable request."
        attempt.raw_callback = payload
        attempt.completed_at = timezone.now()
        attempt.save()
        return attempt

    payment, created = Payment.objects.get_or_create(
        attempt=attempt,
        defaults={
            "provider_reference": provider_reference[:64],
            "amount": paid_amount,
            "currency": invoice.currency,
            "phone_number": phone_number or attempt.phone_number,
            "paid_at": callback_datetime(transaction_date),
        },
    )
    Receipt.objects.get_or_create(payment=payment)
    if created:
        invoice.amount_paid += paid_amount
        invoice.save(update_fields=("amount_paid", "updated_at"))
    attempt.status = PaymentAttempt.Status.SUCCEEDED
    attempt.result_code = 0
    attempt.raw_callback = payload
    attempt.completed_at = timezone.now()
    attempt.save()
    refresh_invoice(invoice)
    lift_resolved_overdue_restrictions(invoice.student)
    return attempt


@transaction.atomic
def process_mpesa_callback(payload):
    callback, metadata = callback_metadata(payload)
    checkout_id = callback.get("CheckoutRequestID")
    if not checkout_id:
        raise serializers.ValidationError({"CheckoutRequestID": "This field is required."})
    try:
        attempt = PaymentAttempt.objects.select_for_update().get(
            checkout_request_id=checkout_id, provider=PaymentAttempt.Provider.MOCK
        )
    except PaymentAttempt.DoesNotExist as exc:
        raise serializers.ValidationError("Unknown CheckoutRequestID.") from exc
    if not accepts_callback(attempt):
        return attempt

    result_code = int(callback.get("ResultCode", 1))
    attempt.result_code = result_code
    attempt.result_description = str(callback.get("ResultDesc", ""))[:255]
    if result_code != 0:
        attempt.status = (
            PaymentAttempt.Status.CANCELLED if result_code == 1032 else PaymentAttempt.Status.FAILED
        )
        attempt.raw_callback = payload
        attempt.completed_at = timezone.now()
        attempt.save()
        return attempt

    try:
        paid_amount = Decimal(str(metadata["Amount"]))
        provider_reference = str(metadata["MpesaReceiptNumber"])
    except (KeyError, InvalidOperation) as exc:
        raise serializers.ValidationError("Successful callbacks require payment metadata.") from exc
    return _record_successful_payment(
        attempt=attempt,
        paid_amount=paid_amount,
        provider_reference=provider_reference,
        phone_number=str(metadata.get("PhoneNumber", "")),
        transaction_date=metadata.get("TransactionDate"),
        payload=payload,
    )


@transaction.atomic
def process_payhero_callback(*, callback_token, payload):
    token_hash = hashlib.sha256(callback_token.encode()).hexdigest()
    response = payload.get("response") if isinstance(payload.get("response"), dict) else payload
    external_reference = response.get("ExternalReference") or response.get("external_reference")
    checkout_id = response.get("CheckoutRequestID") or response.get("checkout_request_id")
    if not external_reference or not checkout_id:
        raise serializers.ValidationError("PayHero callback is missing its payment references.")
    try:
        attempt = PaymentAttempt.objects.select_for_update().get(
            external_reference=external_reference,
            provider=PaymentAttempt.Provider.PAYHERO,
        )
    except PaymentAttempt.DoesNotExist as exc:
        raise serializers.ValidationError("Unknown PayHero payment reference.") from exc
    if not secrets.compare_digest(attempt.callback_token_hash, token_hash):
        raise serializers.ValidationError("Invalid PayHero callback token.")
    if not secrets.compare_digest(attempt.checkout_request_id, str(checkout_id)):
        raise serializers.ValidationError("PayHero checkout reference does not match this attempt.")
    if not accepts_callback(attempt):
        return attempt

    status_text = str(response.get("Status", payload.get("status", ""))).lower()
    raw_result_code = response.get("ResultCode", response.get("result_code"))
    try:
        result_code = int(raw_result_code) if raw_result_code is not None else None
    except (TypeError, ValueError):
        result_code = None
    succeeded = (
        result_code == 0
        if raw_result_code is not None
        else status_text in {"success", "successful", "completed"}
    )
    if not succeeded:
        result_code = (
            result_code if result_code is not None else (1032 if "cancel" in status_text else 1)
        )
        attempt.status = (
            PaymentAttempt.Status.CANCELLED if result_code == 1032 else PaymentAttempt.Status.FAILED
        )
        attempt.result_code = result_code
        attempt.result_description = str(
            response.get("ResultDesc") or response.get("result_description") or status_text
        )[:255]
        attempt.raw_callback = payload
        attempt.completed_at = timezone.now()
        attempt.save()
        return attempt

    try:
        paid_amount = Decimal(str(response["Amount"]))
        provider_reference = str(response["MpesaReceiptNumber"])
    except (KeyError, InvalidOperation) as exc:
        raise serializers.ValidationError(
            "Successful callbacks require amount and M-Pesa receipt data."
        ) from exc
    callback_phone = str(response.get("Phone", ""))
    if callback_phone:
        try:
            callback_phone = normalize_mpesa_phone(callback_phone)
        except serializers.ValidationError as exc:
            raise serializers.ValidationError(
                "PayHero returned an invalid payment phone number."
            ) from exc
        if callback_phone != attempt.phone_number:
            raise serializers.ValidationError("PayHero payment phone does not match the prompt.")
    attempt.result_description = str(response.get("ResultDesc", ""))[:255]
    return _record_successful_payment(
        attempt=attempt,
        paid_amount=paid_amount,
        provider_reference=provider_reference,
        phone_number=callback_phone,
        transaction_date=response.get("TransactionDate"),
        payload=payload,
    )


def mock_callback_payload(attempt, *, succeed):
    result_code = 0 if succeed else 1032
    callback = {
        "MerchantRequestID": attempt.merchant_request_id,
        "CheckoutRequestID": attempt.checkout_request_id,
        "ResultCode": result_code,
        "ResultDesc": (
            "The service request is processed successfully."
            if succeed
            else "Request cancelled by user."
        ),
    }
    if succeed:
        callback["CallbackMetadata"] = {
            "Item": [
                {"Name": "Amount", "Value": float(attempt.requested_amount)},
                {"Name": "MpesaReceiptNumber", "Value": reference_number("MPESA")},
                {"Name": "TransactionDate", "Value": int(timezone.now().strftime("%Y%m%d%H%M%S"))},
                {"Name": "PhoneNumber", "Value": int(attempt.phone_number)},
            ]
        }
    return {"Body": {"stkCallback": callback}}


@transaction.atomic
def refund_payment(*, payment, amount, reason, actor):
    payment = (
        Payment.objects.select_for_update().select_related("attempt__invoice").get(pk=payment.pk)
    )
    if amount > payment.refundable_amount:
        raise serializers.ValidationError(
            {"amount": f"Only {payment.refundable_amount} is available to refund."}
        )
    gateway = get_gateway()
    if gateway.name != "mock":
        raise serializers.ValidationError(
            "PayHero refunds are not enabled here. Process the refund in the provider portal."
        )
    response = gateway.refund(
        provider_reference=payment.provider_reference,
        amount=amount,
        reason=reason,
    )
    refund = Refund.objects.create(
        payment=payment,
        amount=amount,
        reason=reason,
        status=Refund.Status.SUCCEEDED,
        provider_reference=response["OriginatorConversationID"],
        requested_by=actor,
        processed_at=timezone.now(),
        raw_response=response,
    )
    payment.amount_refunded += amount
    payment.status = (
        Payment.Status.REFUNDED
        if payment.amount_refunded == payment.amount
        else Payment.Status.PARTIALLY_REFUNDED
    )
    payment.save(update_fields=("amount_refunded", "status", "updated_at"))
    invoice = payment.attempt.invoice
    invoice.amount_paid -= amount
    invoice.save(update_fields=("amount_paid", "updated_at"))
    refresh_invoice(invoice)
    return refund


def active_restrictions(student):
    now = timezone.now()
    return student.restrictions.filter(status=StudentAccessRestriction.Status.ACTIVE).filter(
        Q(restricted_until__isnull=True) | Q(restricted_until__gt=now)
    )


def lift_resolved_overdue_restrictions(student):
    has_overdue = student.invoices.filter(
        status=Invoice.Status.OVERDUE,
        amount_paid__lt=models_f("total_amount"),
    ).exists()
    if has_overdue:
        return
    student.restrictions.filter(
        status=StudentAccessRestriction.Status.ACTIVE,
        reason=StudentAccessRestriction.Reason.OVERDUE_PAYMENT,
    ).update(status=StudentAccessRestriction.Status.LIFTED, lifted_at=timezone.now())


def models_f(field):
    from django.db.models import F

    return F(field)


def mark_overdue_invoices(today=None):
    """Flag unpaid invoices past their due date. Runs daily; restricting access stays manual."""
    today = today or timezone.localdate()
    return Invoice.objects.filter(
        due_date__lt=today,
        status__in=(Invoice.Status.ISSUED, Invoice.Status.PARTIALLY_PAID),
        amount_paid__lt=models_f("total_amount"),
    ).update(status=Invoice.Status.OVERDUE)


@transaction.atomic
def apply_overdue_restrictions(*, actor, scope=StudentAccessRestriction.Scope.CLASS_ACCESS):
    today = timezone.localdate()
    StudentAccessRestriction.objects.filter(
        status=StudentAccessRestriction.Status.ACTIVE,
        restricted_until__lte=timezone.now(),
    ).update(status=StudentAccessRestriction.Status.LIFTED, lifted_at=timezone.now())
    mark_overdue_invoices(today)
    students = {
        invoice.student
        for invoice in Invoice.objects.select_related("student").filter(
            status=Invoice.Status.OVERDUE,
            amount_paid__lt=models_f("total_amount"),
        )
    }
    created = 0
    for student in students:
        _, was_created = StudentAccessRestriction.objects.get_or_create(
            student=student,
            scope=scope,
            status=StudentAccessRestriction.Status.ACTIVE,
            defaults={
                "reason": StudentAccessRestriction.Reason.OVERDUE_PAYMENT,
                "note": "Automatically restricted because an invoice is overdue.",
                "created_by": actor,
            },
        )
        created += int(was_created)
    return {"restricted": created, "overdue_students": len(students)}


@transaction.atomic
def run_reconciliation(*, actor):
    run = ReconciliationRun.objects.create(created_by=actor)
    attempts = PaymentAttempt.objects.filter(status=PaymentAttempt.Status.SUCCEEDED)
    payments = Payment.objects.select_related("attempt__invoice")
    invoices = Invoice.objects.exclude(status=Invoice.Status.VOID)
    run.checked_count = attempts.count() + payments.count() + invoices.count()

    for attempt in attempts:
        if not hasattr(attempt, "payment"):
            ReconciliationIssue.objects.create(
                run=run,
                kind=ReconciliationIssue.Kind.MISSING_PAYMENT,
                attempt=attempt,
                invoice=attempt.invoice,
                detail="The provider attempt succeeded but no payment record exists.",
            )
    for payment in payments:
        if not hasattr(payment, "receipt"):
            ReconciliationIssue.objects.create(
                run=run,
                kind=ReconciliationIssue.Kind.MISSING_RECEIPT,
                payment=payment,
                invoice=payment.attempt.invoice,
                detail="A successful payment has no receipt.",
            )
    for invoice in invoices:
        net_paid = sum(
            (
                payment.amount - payment.amount_refunded
                for payment in payments
                if payment.attempt.invoice_id == invoice.pk
            ),
            Decimal("0.00"),
        )
        if net_paid != invoice.amount_paid:
            ReconciliationIssue.objects.create(
                run=run,
                kind=ReconciliationIssue.Kind.INVOICE_MISMATCH,
                invoice=invoice,
                expected_value=str(net_paid),
                actual_value=str(invoice.amount_paid),
                detail="Invoice amount paid does not match successful payments minus refunds.",
            )
    run.issue_count = run.issues.count()
    run.status = ReconciliationRun.Status.COMPLETED
    run.completed_at = timezone.now()
    run.save(update_fields=("checked_count", "issue_count", "status", "completed_at"))
    return run
