from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.academics.models import (
    AttendanceRecord,
    ClassGroup,
    ScheduleRule,
    Subject,
    TeacherSubject,
)
from apps.campaigns.models import ProgramRegistration
from apps.core.models import OrganizationSettings
from apps.resources.models import Resource
from tests.conftest import client_for

pytestmark = pytest.mark.django_db


def teacher_url(data, suffix=""):
    return f"/api/v1/portal/teacher/classes/{data['class_group'].id}/attendance/{suffix}"


def save(data, lesson_date, status="PRESENT", user_key="teacher_user"):
    return client_for(data[user_key]).post(
        teacher_url(data)
        if user_key == "teacher_user"
        else f"/api/v1/classes/{data['class_group'].id}/attendance/",
        {
            "lesson_date": str(lesson_date),
            "records": [{"student_id": data["student"].id, "status": status}],
        },
        format="json",
    )


# --- Attendance --------------------------------------------------------------


def test_teacher_takes_and_corrects_attendance(billing_data):
    today = timezone.localdate()
    sheet = client_for(billing_data["teacher_user"]).get(
        teacher_url(billing_data) + f"?date={today}"
    )
    assert [row["name"] for row in sheet.json()["students"]] == ["Amina Kamau"]
    assert sheet.json()["is_recorded"] is False

    assert save(billing_data, today, "ABSENT").status_code == 200
    corrected = save(billing_data, today, "LATE")

    assert corrected.json()["students"][0]["status"] == "LATE"
    assert AttendanceRecord.objects.count() == 1


def test_attendance_guards(billing_data):
    tomorrow = timezone.localdate() + timedelta(days=1)
    assert save(billing_data, tomorrow).status_code == 400
    other = client_for(billing_data["teacher_user"]).post(
        teacher_url(billing_data),
        {
            "lesson_date": str(timezone.localdate()),
            "records": [{"student_id": billing_data["other_student"].id, "status": "PRESENT"}],
        },
        format="json",
    )
    assert other.status_code == 400
    student = client_for(billing_data["student_user"]).get(teacher_url(billing_data))
    assert student.status_code == 403


def test_summary_rates_and_dashboard_today(billing_data):
    today = timezone.localdate()
    ScheduleRule.objects.create(
        class_group=billing_data["class_group"],
        weekday=today.weekday(),
        start_time="16:00",
        end_time="17:00",
    )
    save(billing_data, today - timedelta(days=7), "ABSENT", user_key="owner")
    save(billing_data, today, "PRESENT")
    owner = client_for(billing_data["owner"])

    summary = owner.get(
        f"/api/v1/attendance/summary/?start={today - timedelta(days=13)}&end={today}"
    ).json()

    assert summary["rate"] == 50.0
    assert summary["totals"] == {"present": 1, "late": 0, "absent": 1, "excused": 0}
    assert len(summary["by_day"]) == 14
    assert summary["by_class"][0]["rate"] == 50.0
    assert summary["frequent_absentees"][0]["name"] == "Amina Kamau"
    today_stats = owner.get("/api/v1/dashboard/summary/").json()["attendance_today"]
    assert today_stats == {"lessons_scheduled": 1, "lessons_recorded": 1, "rate": 100.0}


# --- Resources for teachers and students -------------------------------------


def test_teacher_adds_resources_only_for_their_subjects(billing_data):
    teacher = client_for(billing_data["teacher_user"])
    maths = billing_data["class_group"].subject
    art = Subject.objects.create(name="Art")
    payload = {
        "title": "Fractions",
        "resource_type": "NOTES",
        "download_url": "https://drive.example.com/f",
    }

    ok = teacher.post(
        "/api/v1/portal/teacher/resources/",
        {**payload, "subject_id": maths.id, "price_amount": "500"},
        format="json",
    )
    wrong = teacher.post(
        "/api/v1/portal/teacher/resources/", {**payload, "subject_id": art.id}, format="json"
    )

    assert ok.status_code == 201
    assert Resource.objects.get(title="Fractions").price_amount is None  # teachers can't price
    assert wrong.status_code == 400
    assert [
        r["title"] for r in teacher.get("/api/v1/portal/teacher/resources/").json()["results"]
    ] == ["Fractions"]


def test_student_resource_list_flags_access(billing_data):
    maths = billing_data["class_group"].subject
    owner = billing_data["owner"]
    Resource.objects.create(
        title="Maths paper",
        subject=maths,
        price_amount=Decimal("100"),
        is_published=True,
        created_by=owner,
    )
    Resource.objects.create(
        title="Art paper",
        subject=Subject.objects.create(name="Art"),
        price_amount=Decimal("100"),
        is_published=True,
        created_by=owner,
    )

    rows = client_for(billing_data["student_user"]).get("/api/v1/portal/student/resources/").json()

    flags = {row["title"]: (row["can_open"], row["for_my_subjects"]) for row in rows}
    assert flags == {"Maths paper": (True, True), "Art paper": (False, False)}
    assert "download_url" not in rows[0]


# --- Reports ------------------------------------------------------------------


def test_reports_summary_and_csv(billing_data):
    owner = client_for(billing_data["owner"])
    owner.post(
        f"/api/v1/payments/invoices/{billing_data['invoice'].id}/record/",
        {"method": "CASH", "amount": "500.00"},
        format="json",
    )
    ProgramRegistration.objects.create(
        student_name='=HYPERLINK("http://evil")',
        parent_name="P",
        level="FORM_3",
        study_mode="ONLINE_GROUP",
        subjects=["MATHEMATICS"],
        parent_phone="0712345678",
    )

    summary = owner.get(
        f"/api/v1/reports/summary/?start={date.today() - timedelta(days=6)}&end={date.today()}"
    ).json()

    assert summary["unit"] == "day"
    assert Decimal(summary["totals"]["collected"]) == Decimal("500")
    assert Decimal(summary["totals"]["outstanding"]) == Decimal("1000")
    assert summary["outstanding_by_class"][0]["name"] == "Grade 6 Mathematics"
    assert summary["payment_methods"][0]["label"] == "Cash"
    assert summary["totals"]["new_registrations"] == 1

    csv = owner.get("/api/v1/reports/export/registrations/").content.decode("utf-8-sig")
    assert "'=HYPERLINK" in csv
    assert owner.get("/api/v1/reports/export/secrets/").status_code == 404
    assert (
        client_for(billing_data["teacher_user"]).get("/api/v1/reports/summary/").status_code == 403
    )


def test_weekly_buckets_for_long_ranges(billing_data):
    summary = (
        client_for(billing_data["owner"])
        .get("/api/v1/reports/summary/?start=2026-01-01&end=2026-03-31")
        .json()
    )

    assert summary["unit"] == "week"
    assert len(summary["collections"]) == 14


# --- Search, activity, settings ----------------------------------------------


def test_search_and_activity(billing_data):
    owner = client_for(billing_data["owner"])

    results = owner.get("/api/v1/search/?q=amina").json()
    assert results[0] == {
        "type": "student",
        "title": "Amina Kamau",
        "detail": "Grade 6 · Active",
        "link": f"/students/{billing_data['student'].id}",
    }
    assert owner.get("/api/v1/search/?q=a").json() == []

    feed = owner.get("/api/v1/dashboard/activity/").json()
    assert feed[0]["type"] == "enrollment"


def test_organization_settings_drive_public_phone(billing_data):
    owner = client_for(billing_data["owner"])

    response = owner.patch(
        "/api/v1/settings/organization/",
        {"contact_phone": "0711 999 888", "paybill_display": "Paybill 123"},
        format="json",
    )

    assert response.status_code == 200
    assert OrganizationSettings.load().paybill_display == "Paybill 123"
    assert APIClient().get("/api/v1/public/site/").json()["contact_phone"] == "0711 999 888"


def test_merge_subjects_moves_teachers_classes_and_resources(billing_data):
    maths = billing_data["class_group"].subject
    stray = Subject.objects.create(name="maths")
    teacher = billing_data["class_group"].primary_teacher
    TeacherSubject.objects.create(teacher=teacher, subject=stray)
    stray_class = ClassGroup.objects.create(
        name="Stray",
        subject=stray,
        grade_level="Grade 6",
        term=billing_data["class_group"].term,
        primary_teacher=teacher,
        created_by=billing_data["owner"],
    )

    response = client_for(billing_data["owner"]).post(
        f"/api/v1/subjects/{stray.id}/merge/", {"into_id": maths.id}, format="json"
    )

    assert response.status_code == 200
    assert not Subject.objects.filter(pk=stray.pk).exists()
    stray_class.refresh_from_db()
    assert stray_class.subject == maths
    assert TeacherSubject.objects.filter(teacher=teacher).count() == 1


def test_programs_are_managed_by_admins(billing_data):
    owner = client_for(billing_data["owner"])
    created = owner.post(
        "/api/v1/programs/",
        {
            "title": "Easter program",
            "starts_on": "2027-04-01",
            "ends_on": "2027-03-01",
        },
        format="json",
    )
    assert created.status_code == 400

    created = owner.post(
        "/api/v1/programs/",
        {
            "title": "Easter program",
            "starts_on": "2027-04-01",
            "ends_on": "2027-04-20",
        },
        format="json",
    )
    assert created.status_code == 201
    assert [p["title"] for p in owner.get("/api/v1/programs/").json()] == ["Easter program"]


def test_teacher_can_add_resources_for_a_subject_they_teach_a_class_in(billing_data):
    TeacherSubject.objects.filter(teacher=billing_data["class_group"].primary_teacher).delete()

    response = client_for(billing_data["teacher_user"]).post(
        "/api/v1/portal/teacher/resources/",
        {
            "title": "Algebra",
            "resource_type": "NOTES",
            "download_url": "https://drive.example.com/a",
            "subject_id": billing_data["class_group"].subject_id,
        },
        format="json",
    )

    assert response.status_code == 201
