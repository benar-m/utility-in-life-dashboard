from datetime import date, timedelta

import pytest
from rest_framework.test import APIClient

from apps.academics.models import ClassEnrollment, ClassGroup, ScheduleRule
from apps.accounts.models import Student, TeacherProfile, User

pytestmark = pytest.mark.django_db


@pytest.fixture
def owner():
    return User.objects.create_superuser(
        email="owner@example.com",
        password="Owner-password-2026!",
        first_name="Platform",
        last_name="Owner",
    )


@pytest.fixture
def authenticated_client(owner):
    client = APIClient()
    client.force_authenticate(owner)
    return client


def test_login_refresh_and_logout_require_csrf(owner):
    client = APIClient(enforce_csrf_checks=True)
    csrf_response = client.get("/api/v1/auth/csrf/")
    csrf_token = csrf_response.json()["csrf_token"]

    rejected = client.post(
        "/api/v1/auth/login/",
        {"email": owner.email, "password": "Owner-password-2026!"},
        format="json",
    )
    assert rejected.status_code == 403

    login = client.post(
        "/api/v1/auth/login/",
        {"email": owner.email, "password": "Owner-password-2026!"},
        format="json",
        HTTP_X_CSRFTOKEN=csrf_token,
    )
    assert login.status_code == 200
    assert login.json()["user"]["role"] == User.Role.OWNER
    assert "access" in login.json()
    assert "uil_refresh" in login.cookies

    refresh = client.post(
        "/api/v1/auth/refresh/",
        format="json",
        HTTP_X_CSRFTOKEN=csrf_token,
    )
    assert refresh.status_code == 200
    assert "access" in refresh.json()

    logout = client.post(
        "/api/v1/auth/logout/",
        format="json",
        HTTP_X_CSRFTOKEN=csrf_token,
    )
    assert logout.status_code == 204


def test_admin_vertical_slice_creates_student_teacher_and_class(authenticated_client):
    student_response = authenticated_client.post(
        "/api/v1/students/",
        {
            "first_name": "Amina",
            "last_name": "Kamau",
            "grade_level": "Grade 6",
            "guardian_name": "Mary Kamau",
            "guardian_email": "mary@example.com",
            "guardian_phone": "+254700000000",
        },
        format="json",
    )
    assert student_response.status_code == 201, student_response.json()

    invitation_response = authenticated_client.post(
        "/api/v1/users/invitations/",
        {
            "full_name": "Daniel Otieno",
            "email": "daniel@example.com",
            "phone": "+254711111111",
            "role": User.Role.TEACHER,
            "subject_names": ["Mathematics", "Science"],
        },
        format="json",
    )
    assert invitation_response.status_code == 201, invitation_response.json()
    raw_token = invitation_response.json()["acceptance_url"].rsplit("/", maxsplit=1)[-1]
    acceptance_response = authenticated_client.post(
        f"/api/v1/auth/invitations/{raw_token}/accept/",
        {
            "password": "Teacher-password-2026!",
            "password_confirmation": "Teacher-password-2026!",
        },
        format="json",
    )
    assert acceptance_response.status_code == 200, acceptance_response.json()
    teacher = TeacherProfile.objects.get(user__email="daniel@example.com")

    starts_on = date.today()
    class_response = authenticated_client.post(
        "/api/v1/classes/",
        {
            "name": "Grade 6 Mathematics",
            "subject_name": "Mathematics",
            "grade_level": "Grade 6",
            "term_name": "Current term",
            "term_starts_on": starts_on,
            "term_ends_on": starts_on + timedelta(days=90),
            "teacher_id": teacher.id,
            "student_ids": [student_response.json()["id"]],
            "capacity": 12,
            "default_meeting_url": "https://meet.example.com/grade-6",
            "schedule_days": [0, 3],
            "schedule_start_time": "16:00",
            "schedule_end_time": "17:00",
        },
        format="json",
    )
    assert class_response.status_code == 201, class_response.json()
    assert class_response.json()["enrolled_count"] == 1
    assert len(class_response.json()["schedule_rules"]) == 2
    assert Student.objects.count() == 1
    assert TeacherProfile.objects.count() == 1
    assert ClassGroup.objects.count() == 1
    assert ClassEnrollment.objects.count() == 1
    assert ScheduleRule.objects.count() == 2

    summary = authenticated_client.get("/api/v1/dashboard/summary/")
    assert summary.status_code == 200
    assert summary.json() == {
        "active_students": 1,
        "active_teachers": 1,
        "active_classes": 1,
        "attendance_today": None,
    }


def test_teacher_cannot_access_admin_lists(owner):
    teacher_user = User.objects.create_user(
        email="teacher@example.com",
        password="Teacher-password-2026!",
        role=User.Role.TEACHER,
    )
    client = APIClient()
    client.force_authenticate(teacher_user)

    assert client.get("/api/v1/students/").status_code == 403
    assert client.get("/api/v1/teachers/").status_code == 403
    assert client.get("/api/v1/classes/").status_code == 403
