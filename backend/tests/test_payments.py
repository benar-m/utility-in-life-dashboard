import io
import json
from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.conf import settings
from django.test import override_settings
from rest_framework.test import APIClient

from apps.academics.models import (
    AcademicTerm,
    ClassEnrollment,
    ClassGroup,
    Subject,
    TeacherSubject,
)
from apps.academics.services import assign_student_to_class
from apps.accounts.models import Student, TeacherProfile, User
from apps.payments.gateways import PayHeroGateway
from apps.payments.models import (
    Invoice,
    Payment,
    PaymentAttempt,
    Receipt,
    ReconciliationIssue,
    Refund,
    StudentAccessRestriction,
)
from apps.payments.services import mock_callback_payload

pytestmark = pytest.mark.django_db


def client_for(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.fixture
def billing_data():
    owner = User.objects.create_superuser(
        email="owner@example.com",
        password="Owner-password-2026!",
    )
    teacher_user = User.objects.create_user(
        email="teacher@example.com",
        password="Teacher-password-2026!",
        role=User.Role.TEACHER,
    )
    teacher = TeacherProfile.objects.create(user=teacher_user)
    student_user = User.objects.create_user(
        email="student@example.com",
        password="Student-password-2026!",
        role=User.Role.STUDENT,
    )
    student = Student.objects.create(
        user=student_user,
        first_name="Amina",
        last_name="Kamau",
        grade_level="Grade 6",
    )
    other_student_user = User.objects.create_user(
        email="other-student@example.com",
        password="Student-password-2026!",
        role=User.Role.STUDENT,
    )
    other_student = Student.objects.create(
        user=other_student_user,
        first_name="Brian",
        last_name="Omondi",
        grade_level="Grade 6",
    )
    subject = Subject.objects.create(name="Mathematics")
    TeacherSubject.objects.create(teacher=teacher, subject=subject)
    term = AcademicTerm.objects.create(
        name="Current term",
        starts_on=date.today(),
        ends_on=date.today() + timedelta(days=90),
    )
    class_group = ClassGroup.objects.create(
        name="Grade 6 Mathematics",
        subject=subject,
        grade_level="Grade 6",
        term=term,
        primary_teacher=teacher,
        cost_amount=Decimal("1500.00"),
        created_by=owner,
    )
    enrollment, _ = assign_student_to_class(student, class_group, actor=owner)
    invoice = Invoice.objects.get(enrollment=enrollment)
    return {
        "owner": owner,
        "teacher_user": teacher_user,
        "student_user": student_user,
        "student": student,
        "other_student_user": other_student_user,
        "other_student": other_student,
        "class_group": class_group,
        "enrollment": enrollment,
        "invoice": invoice,
    }


def start_prompt(data, amount="1500.00"):
    response = client_for(data["student_user"]).post(
        f"/api/v1/payments/invoices/{data['invoice'].id}/pay/",
        {"phone_number": "0712345678", "amount": amount},
        format="json",
    )
    assert response.status_code == 201, response.json()
    return PaymentAttempt.objects.get(pk=response.json()["id"])


def test_class_assignment_issues_invoice_and_records_balance(billing_data):
    invoice = billing_data["invoice"]
    enrollment = billing_data["enrollment"]

    assert invoice.total_amount == Decimal("1500.00")
    assert invoice.amount_due == Decimal("1500.00")
    assert invoice.student == billing_data["student"]
    assert enrollment.balance_due == Decimal("1500.00")
    assert enrollment.financial_status == ClassEnrollment.FinancialStatus.PENDING


def test_owner_can_create_one_off_invoice(billing_data):
    response = client_for(billing_data["owner"]).post(
        "/api/v1/payments/invoices/",
        {
            "student_id": billing_data["student"].id,
            "description": "Study materials",
            "total_amount": "750.00",
            "due_date": str(date.today() + timedelta(days=7)),
        },
        format="json",
    )

    assert response.status_code == 201, response.json()
    assert response.json()["total_amount"] == "750.00"
    assert Invoice.objects.filter(description="Study materials").exists()


def test_admin_can_record_cash_or_bank_payment_without_prompt(billing_data):
    owner_client = client_for(billing_data["owner"])
    invoice = billing_data["invoice"]

    cash_response = owner_client.post(
        f"/api/v1/payments/invoices/{invoice.id}/record/",
        {"method": "CASH", "amount": "500.00", "note": "Received at the office"},
        format="json",
    )
    assert cash_response.status_code == 201, cash_response.json()
    assert cash_response.json()["provider"] == PaymentAttempt.Provider.MANUAL
    assert cash_response.json()["method"] == Payment.Method.CASH
    assert cash_response.json()["recording_note"] == "Received at the office"
    assert Receipt.objects.filter(payment__attempt__invoice=invoice).count() == 1
    student_receipts = client_for(billing_data["student_user"]).get("/api/v1/payments/receipts/")
    assert student_receipts.status_code == 200
    assert student_receipts.json()["results"][0]["method"] == Payment.Method.CASH

    invoice.refresh_from_db()
    assert invoice.amount_paid == Decimal("500.00")
    assert invoice.amount_due == Decimal("1000.00")
    billing_data["enrollment"].refresh_from_db()
    assert billing_data["enrollment"].balance_due == Decimal("1000.00")

    missing_bank_reference = owner_client.post(
        f"/api/v1/payments/invoices/{invoice.id}/record/",
        {"method": "BANK", "amount": "250.00"},
        format="json",
    )
    bank_response = owner_client.post(
        f"/api/v1/payments/invoices/{invoice.id}/record/",
        {"method": "BANK", "amount": "250.00", "reference": "BNK-12345"},
        format="json",
    )
    duplicate_reference = owner_client.post(
        f"/api/v1/payments/invoices/{invoice.id}/record/",
        {"method": "BANK", "amount": "100.00", "reference": "bnk-12345"},
        format="json",
    )
    unauthorized = client_for(billing_data["student_user"]).post(
        f"/api/v1/payments/invoices/{invoice.id}/record/",
        {"method": "CASH", "amount": "100.00"},
        format="json",
    )

    assert missing_bank_reference.status_code == 400
    assert bank_response.status_code == 201, bank_response.json()
    assert bank_response.json()["provider_reference"] == "BNK-12345"
    assert duplicate_reference.status_code == 400
    assert unauthorized.status_code == 403
    assert Payment.objects.filter(attempt__provider=PaymentAttempt.Provider.MANUAL).count() == 2
    reconciliation = owner_client.post("/api/v1/payments/reconciliations/", {}, format="json")
    assert reconciliation.status_code == 201
    assert reconciliation.json()["issue_count"] == 0


def test_offline_record_is_blocked_while_mpesa_prompt_is_pending(billing_data):
    start_prompt(billing_data)
    response = client_for(billing_data["owner"]).post(
        f"/api/v1/payments/invoices/{billing_data['invoice'].id}/record/",
        {"method": "CASH", "amount": "100.00"},
        format="json",
    )

    assert response.status_code == 400
    assert Payment.objects.count() == 0


@override_settings(
    PAYMENT_GATEWAY="payhero",
    PAYHERO_USERNAME="test-user",
    PAYHERO_PASSWORD="test-password",
    PAYHERO_CHANNEL_ID="8748",
    PAYHERO_API_BASE_URL="https://backend.payhero.co.ke",
    PAYHERO_REQUEST_TIMEOUT=3,
)
def test_payhero_stk_request_shape_is_verified_without_network(monkeypatch):
    captured = {}

    def fake_urlopen(request, timeout):
        captured["url"] = request.full_url
        captured["method"] = request.get_method()
        captured["body"] = json.loads(request.data)
        captured["authorization"] = request.get_header("Authorization")
        captured["timeout"] = timeout
        return io.BytesIO(
            json.dumps(
                {
                    "success": True,
                    "status": "QUEUED",
                    "reference": "PH-REF-1",
                    "CheckoutRequestID": "ws_CO_123",
                }
            ).encode()
        )

    monkeypatch.setattr("apps.payments.gateways.urlopen", fake_urlopen)
    response = PayHeroGateway().initiate_stk_push(
        phone_number="254712345678",
        amount=Decimal("1500"),
        account_reference="INV-1",
        description="Math tuition",
        external_reference="UIL-REF-1",
        customer_name="Student Example",
        callback_url="https://api.example.com/payhero/token/",
    )

    assert captured["url"] == "https://backend.payhero.co.ke/api/v2/payments"
    assert captured["method"] == "POST"
    assert captured["authorization"].startswith("Basic ")
    assert captured["timeout"] == 3
    assert captured["body"] == {
        "amount": 1500,
        "phone_number": "254712345678",
        "channel_id": 8748,
        "provider": "m-pesa",
        "external_reference": "UIL-REF-1",
        "customer_name": "Student Example",
        "callback_url": "https://api.example.com/payhero/token/",
    }
    assert response.checkout_request_id == "ws_CO_123"
    assert response.merchant_request_id == "PH-REF-1"


def test_invoice_and_transaction_queries_are_student_scoped(billing_data):
    own = client_for(billing_data["student_user"]).get("/api/v1/payments/invoices/")
    other = client_for(billing_data["other_student_user"]).get("/api/v1/payments/invoices/")
    teacher = client_for(billing_data["teacher_user"]).get("/api/v1/payments/invoices/")
    unauthorized_create = client_for(billing_data["student_user"]).post(
        "/api/v1/payments/invoices/",
        {
            "student_id": billing_data["student"].id,
            "description": "Not allowed",
            "total_amount": "10.00",
            "due_date": str(date.today()),
        },
        format="json",
    )

    assert [item["id"] for item in own.json()["results"]] == [str(billing_data["invoice"].id)]
    assert other.json()["results"] == []
    assert teacher.json()["results"] == []
    assert unauthorized_create.status_code == 403


def test_mock_stk_success_creates_payment_receipt_and_is_idempotent(billing_data):
    attempt = start_prompt(billing_data)
    student_client = client_for(billing_data["student_user"])

    approved = student_client.post(
        f"/api/v1/payments/attempts/{attempt.id}/simulate/",
        {"outcome": "SUCCESS"},
        format="json",
    )
    repeated = student_client.post(
        f"/api/v1/payments/attempts/{attempt.id}/simulate/",
        {"outcome": "SUCCESS"},
        format="json",
    )

    assert approved.status_code == 200, approved.json()
    assert repeated.status_code == 400
    assert Payment.objects.count() == 1
    assert Receipt.objects.count() == 1
    billing_data["invoice"].refresh_from_db()
    billing_data["enrollment"].refresh_from_db()
    assert billing_data["invoice"].status == Invoice.Status.PAID
    assert billing_data["invoice"].amount_due == 0
    assert billing_data["enrollment"].financial_status == ClassEnrollment.FinancialStatus.CLEARED

    receipt_response = student_client.get("/api/v1/payments/receipts/")
    assert receipt_response.status_code == 200
    assert receipt_response.json()["results"][0]["invoice_number"] == billing_data["invoice"].number


def test_mock_stk_cancel_does_not_create_payment(billing_data):
    attempt = start_prompt(billing_data)
    response = client_for(billing_data["student_user"]).post(
        f"/api/v1/payments/attempts/{attempt.id}/simulate/",
        {"outcome": "CANCELLED"},
        format="json",
    )

    assert response.status_code == 200
    assert response.json()["status"] == PaymentAttempt.Status.CANCELLED
    assert Payment.objects.count() == 0
    billing_data["invoice"].refresh_from_db()
    assert billing_data["invoice"].amount_paid == 0


@override_settings(PAYMENT_GATEWAY="payhero")
def test_mock_completion_paths_are_disabled_when_payhero_is_selected(billing_data):
    attempt = PaymentAttempt.objects.create(
        invoice=billing_data["invoice"],
        provider=PaymentAttempt.Provider.MOCK,
        external_reference="UIL-MOCK-PRODUCTION-GUARD",
        phone_number="254712345678",
        requested_amount=Decimal("100.00"),
        merchant_request_id="MOCK-MERCHANT-PRODUCTION-GUARD",
        checkout_request_id="MOCK-CHECKOUT-PRODUCTION-GUARD",
        initiated_by=billing_data["owner"],
    )

    simulated = client_for(billing_data["student_user"]).post(
        f"/api/v1/payments/attempts/{attempt.id}/simulate/",
        {"outcome": "SUCCESS"},
        format="json",
    )
    callback = APIClient().post(
        "/api/v1/payments/mpesa/callback/",
        {},
        format="json",
        HTTP_X_MOCK_MPESA_TOKEN=settings.MPESA_CALLBACK_TOKEN,
    )

    assert simulated.status_code == 403
    assert callback.status_code == 404
    assert Payment.objects.count() == 0


def test_callback_requires_token_and_safe_replay_does_not_duplicate_money(billing_data):
    attempt = start_prompt(billing_data)
    payload = mock_callback_payload(attempt, succeed=True)
    anonymous = APIClient()

    denied = anonymous.post("/api/v1/payments/mpesa/callback/", payload, format="json")
    accepted = anonymous.post(
        "/api/v1/payments/mpesa/callback/",
        payload,
        format="json",
        HTTP_X_MOCK_MPESA_TOKEN=settings.MPESA_CALLBACK_TOKEN,
    )
    replayed = anonymous.post(
        "/api/v1/payments/mpesa/callback/",
        payload,
        format="json",
        HTTP_X_MOCK_MPESA_TOKEN=settings.MPESA_CALLBACK_TOKEN,
    )

    assert denied.status_code == 403
    assert accepted.status_code == 200
    assert replayed.status_code == 200
    assert Payment.objects.count() == 1
    assert Receipt.objects.count() == 1
    billing_data["invoice"].refresh_from_db()
    assert billing_data["invoice"].amount_paid == Decimal("1500.00")


def test_refund_updates_payment_and_reopens_invoice(billing_data):
    attempt = start_prompt(billing_data)
    client_for(billing_data["student_user"]).post(
        f"/api/v1/payments/attempts/{attempt.id}/simulate/",
        {"outcome": "SUCCESS"},
        format="json",
    )
    payment = Payment.objects.get()
    owner_client = client_for(billing_data["owner"])

    partial = owner_client.post(
        f"/api/v1/payments/transactions/{payment.id}/refund/",
        {"amount": "500.00", "reason": "Class was cancelled"},
        format="json",
    )
    excessive = owner_client.post(
        f"/api/v1/payments/transactions/{payment.id}/refund/",
        {"amount": "1001.00", "reason": "Too much"},
        format="json",
    )

    assert partial.status_code == 201, partial.json()
    assert excessive.status_code == 400
    payment.refresh_from_db()
    billing_data["invoice"].refresh_from_db()
    assert payment.status == Payment.Status.PARTIALLY_REFUNDED
    assert payment.amount_refunded == Decimal("500.00")
    assert billing_data["invoice"].amount_due == Decimal("500.00")
    assert Refund.objects.count() == 1


def test_regenerating_after_partial_payment_does_not_duplicate_invoice(billing_data):
    attempt = start_prompt(billing_data, amount="500.00")
    client_for(billing_data["student_user"]).post(
        f"/api/v1/payments/attempts/{attempt.id}/simulate/",
        {"outcome": "SUCCESS"},
        format="json",
    )

    generated = client_for(billing_data["owner"]).post(
        "/api/v1/payments/invoices/generate/",
        {},
        format="json",
    )

    assert generated.status_code == 200
    assert Invoice.objects.count() == 1
    billing_data["invoice"].refresh_from_db()
    assert billing_data["invoice"].amount_paid == Decimal("500.00")
    assert billing_data["invoice"].total_amount == Decimal("1500.00")


def test_overdue_flow_restricts_class_access_and_payment_lifts_it(billing_data):
    invoice = billing_data["invoice"]
    invoice.due_date = date.today() - timedelta(days=1)
    invoice.save(update_fields=("due_date",))
    owner_client = client_for(billing_data["owner"])

    applied = owner_client.post(
        "/api/v1/payments/restrictions/apply-overdue/",
        {},
        format="json",
    )
    student_record = owner_client.get(f"/api/v1/students/{billing_data['student'].id}/")

    assert applied.status_code == 200
    assert applied.json() == {"restricted": 1, "overdue_students": 1}
    restriction = StudentAccessRestriction.objects.get()
    assert student_record.json()["payment_restriction"]["id"] == str(restriction.id)

    attempt = start_prompt(billing_data)
    client_for(billing_data["student_user"]).post(
        f"/api/v1/payments/attempts/{attempt.id}/simulate/",
        {"outcome": "SUCCESS"},
        format="json",
    )
    restriction.refresh_from_db()
    assert restriction.status == StudentAccessRestriction.Status.LIFTED


def test_partially_paid_invoice_becomes_overdue_and_restricted(billing_data):
    attempt = start_prompt(billing_data, amount="500.00")
    client_for(billing_data["student_user"]).post(
        f"/api/v1/payments/attempts/{attempt.id}/simulate/",
        {"outcome": "SUCCESS"},
        format="json",
    )
    billing_data["invoice"].due_date = date.today() - timedelta(days=1)
    billing_data["invoice"].save(update_fields=("due_date",))

    response = client_for(billing_data["owner"]).post(
        "/api/v1/payments/restrictions/apply-overdue/",
        {},
        format="json",
    )

    billing_data["invoice"].refresh_from_db()
    assert response.status_code == 200
    assert billing_data["invoice"].status == Invoice.Status.OVERDUE
    assert StudentAccessRestriction.objects.filter(student=billing_data["student"]).exists()


def test_full_portal_restriction_blocks_learning_api_but_not_payment_api(billing_data):
    StudentAccessRestriction.objects.create(
        student=billing_data["student"],
        scope=StudentAccessRestriction.Scope.FULL_PORTAL,
        reason=StudentAccessRestriction.Reason.MANUAL,
        created_by=billing_data["owner"],
    )
    student_client = client_for(billing_data["student_user"])

    classes = student_client.get("/api/v1/portal/student/classes/")
    invoices = student_client.get("/api/v1/payments/invoices/")

    assert classes.status_code == 403
    assert invoices.status_code == 200
    assert len(invoices.json()["results"]) == 1


def test_reconciliation_reports_clean_ledger_then_detects_invoice_mismatch(billing_data):
    attempt = start_prompt(billing_data)
    client_for(billing_data["student_user"]).post(
        f"/api/v1/payments/attempts/{attempt.id}/simulate/",
        {"outcome": "SUCCESS"},
        format="json",
    )
    owner_client = client_for(billing_data["owner"])

    clean = owner_client.post("/api/v1/payments/reconciliations/", {}, format="json")
    billing_data["invoice"].amount_paid = Decimal("1499.00")
    billing_data["invoice"].save(update_fields=("amount_paid",))
    mismatch = owner_client.post("/api/v1/payments/reconciliations/", {}, format="json")

    assert clean.status_code == 201, clean.json()
    assert clean.json()["issue_count"] == 0
    assert mismatch.status_code == 201
    assert mismatch.json()["issue_count"] == 1
    assert ReconciliationIssue.objects.filter(
        run_id=mismatch.json()["id"],
        kind=ReconciliationIssue.Kind.INVOICE_MISMATCH,
    ).exists()
    issue = ReconciliationIssue.objects.get(run_id=mismatch.json()["id"])
    resolved = owner_client.post(
        f"/api/v1/payments/reconciliation-issues/{issue.id}/resolve/",
        {"resolution_note": "Compared against the mock provider statement."},
        format="json",
    )
    assert resolved.status_code == 200
    issue.refresh_from_db()
    assert issue.resolved_by == billing_data["owner"]
    assert issue.resolved_at is not None


def test_payment_summary_is_admin_only_and_returns_live_counts(billing_data):
    denied = client_for(billing_data["student_user"]).get("/api/v1/payments/summary/")
    summary = client_for(billing_data["owner"]).get("/api/v1/payments/summary/")

    assert denied.status_code == 403
    assert summary.status_code == 200, summary.json()
    assert summary.json()["pending_invoices"] == 1
