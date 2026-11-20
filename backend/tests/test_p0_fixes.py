from datetime import date, timedelta

import pytest
from django.conf import settings
from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APIClient

from apps.academics.models import AcademicTerm, ClassGroup, Subject
from apps.payments.models import Invoice, Payment, PaymentAttempt, StudentAccessRestriction
from apps.payments.services import mock_callback_payload
from tests.conftest import client_for, start_prompt

pytestmark = pytest.mark.django_db


# --- Joining lessons -------------------------------------------------------


def join(data, user_key="student_user"):
    return client_for(data[user_key]).post(
        f"/api/v1/portal/student/classes/{data['class_group'].id}/join/"
    )


def test_join_needs_a_meeting_link(billing_data):
    response = join(billing_data)

    assert response.status_code == 403
    assert "meeting link" in response.json()["detail"]


def test_enrolled_student_gets_the_link(billing_data):
    billing_data["class_group"].default_meeting_url = "https://meet.google.com/abc-defg-hij"
    billing_data["class_group"].save()

    response = join(billing_data)

    assert response.status_code == 200
    assert response.json() == {"meeting_url": "https://meet.google.com/abc-defg-hij"}


def test_student_not_in_the_class_cannot_join(billing_data):
    billing_data["class_group"].default_meeting_url = "https://meet.google.com/abc-defg-hij"
    billing_data["class_group"].save()

    assert join(billing_data, "other_student_user").status_code == 404


def test_restricted_student_cannot_join(billing_data):
    billing_data["class_group"].default_meeting_url = "https://meet.google.com/abc-defg-hij"
    billing_data["class_group"].save()
    StudentAccessRestriction.objects.create(
        student=billing_data["student"],
        reason=StudentAccessRestriction.Reason.OVERDUE_PAYMENT,
        created_by=billing_data["owner"],
    )

    response = join(billing_data)

    assert response.status_code == 403
    assert "paused" in response.json()["detail"]


def test_admin_can_set_a_class_meeting_link(billing_data):
    url = f"/api/v1/classes/{billing_data['class_group'].id}/meeting-link/"
    owner = client_for(billing_data["owner"])

    assert owner.post(url, {"default_meeting_url": "http://x.example"}).status_code == 400
    response = owner.post(url, {"default_meeting_url": "https://zoom.us/j/1"}, format="json")

    assert response.status_code == 200
    assert response.json()["default_meeting_url"] == "https://zoom.us/j/1"
    assert client_for(billing_data["teacher_user"]).post(url, {}).status_code == 403


# --- Stuck M-Pesa prompts --------------------------------------------------


def age_attempt(attempt, seconds):
    PaymentAttempt.objects.filter(pk=attempt.pk).update(
        created_at=timezone.now() - timedelta(seconds=seconds)
    )


def test_recent_pending_prompt_still_blocks_a_second_one(billing_data):
    start_prompt(billing_data)
    response = client_for(billing_data["student_user"]).post(
        f"/api/v1/payments/invoices/{billing_data['invoice'].id}/pay/",
        {"phone_number": "0712345678", "amount": "1500.00"},
        format="json",
    )

    assert response.status_code == 400


def test_stale_prompt_expires_and_a_new_one_can_be_sent(billing_data):
    first = start_prompt(billing_data)
    age_attempt(first, settings.PAYMENT_PROMPT_TIMEOUT_SECONDS + 5)

    second = start_prompt(billing_data)

    first.refresh_from_db()
    assert first.status == PaymentAttempt.Status.FAILED
    assert "in time" in first.result_description
    assert second.status == PaymentAttempt.Status.PENDING


def test_polling_reports_the_timeout(billing_data):
    attempt = start_prompt(billing_data)
    age_attempt(attempt, settings.PAYMENT_PROMPT_TIMEOUT_SECONDS + 5)

    response = client_for(billing_data["student_user"]).get(
        f"/api/v1/payments/attempts/{attempt.id}/"
    )

    assert response.json()["status"] == "FAILED"


def test_late_success_callback_for_a_timed_out_prompt_is_still_recorded(billing_data):
    attempt = start_prompt(billing_data)
    age_attempt(attempt, settings.PAYMENT_PROMPT_TIMEOUT_SECONDS + 5)
    call_command("mark_overdue_invoices")
    attempt.refresh_from_db()
    assert attempt.status == PaymentAttempt.Status.FAILED

    APIClient().post(
        "/api/v1/payments/mpesa/callback/",
        mock_callback_payload(attempt, succeed=True),
        format="json",
        HTTP_X_MOCK_MPESA_TOKEN=settings.MPESA_CALLBACK_TOKEN,
    )

    attempt.refresh_from_db()
    assert attempt.status == PaymentAttempt.Status.SUCCEEDED
    assert Payment.objects.filter(attempt=attempt).exists()


def test_invoice_shows_only_a_live_pending_prompt(billing_data):
    attempt = start_prompt(billing_data)
    url = f"/api/v1/payments/invoices/{billing_data['invoice'].id}/"
    student = client_for(billing_data["student_user"])

    assert student.get(url).json()["pending_prompt"]["id"] == str(attempt.id)
    age_attempt(attempt, settings.PAYMENT_PROMPT_TIMEOUT_SECONDS + 5)
    assert student.get(url).json()["pending_prompt"] is None


# --- Overdue marking -------------------------------------------------------


def test_daily_command_marks_overdue_without_restricting(billing_data):
    Invoice.objects.filter(pk=billing_data["invoice"].pk).update(
        due_date=date.today() - timedelta(days=1)
    )

    call_command("mark_overdue_invoices")

    billing_data["invoice"].refresh_from_db()
    assert billing_data["invoice"].status == Invoice.Status.OVERDUE
    assert not StudentAccessRestriction.objects.exists()


# --- Subjects and terms ----------------------------------------------------


def test_adding_an_existing_subject_reuses_it(billing_data):
    owner = client_for(billing_data["owner"])

    same = owner.post("/api/v1/subjects/", {"name": "  mathematics "}, format="json")
    new = owner.post("/api/v1/subjects/", {"name": "home science"}, format="json")

    assert same.status_code == 200
    assert same.json()["name"] == "Mathematics"
    assert new.status_code == 201
    assert new.json()["name"] == "Home Science"
    assert Subject.objects.filter(name__iexact="mathematics").count() == 1
    teacher = client_for(billing_data["teacher_user"])
    assert teacher.post("/api/v1/subjects/", {"name": "Art"}).status_code == 403


def class_payload(billing_data, **term):
    return {
        "name": "Grade 6 Mathematics B",
        "subject_name": "Mathematics",
        "grade_level": "Grade 6",
        "teacher_id": billing_data["class_group"].primary_teacher_id,
        "schedule_days": [0],
        "schedule_start_time": "16:00",
        "schedule_end_time": "17:00",
        **term,
    }


def test_class_can_reuse_an_existing_term_by_id(billing_data):
    owner = client_for(billing_data["owner"])
    term = billing_data["class_group"].term

    assert [t["name"] for t in owner.get("/api/v1/terms/").json()] == [term.name]
    response = owner.post(
        "/api/v1/classes/", class_payload(billing_data, term_id=term.id), format="json"
    )

    assert response.status_code == 201, response.json()
    assert ClassGroup.objects.get(name="Grade 6 Mathematics B").term == term
    assert AcademicTerm.objects.count() == 1


def test_reusing_a_term_name_with_other_dates_explains_the_existing_term(billing_data):
    response = client_for(billing_data["owner"]).post(
        "/api/v1/classes/",
        class_payload(
            billing_data,
            term_name="current TERM",
            term_starts_on="2027-01-01",
            term_ends_on="2027-03-01",
        ),
        format="json",
    )

    assert response.status_code == 400
    assert "already exists" in str(response.json()["term_name"])
