from datetime import date, timedelta

import pytest
from rest_framework.test import APIClient

from apps.academics.models import (
    AcademicTerm,
    ClassEnrollment,
    ClassGroup,
    ScheduleRule,
    Subject,
    TeacherSubject,
)
from apps.accounts.models import Student, TeacherProfile, User

pytestmark = pytest.mark.django_db


def client_for(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.fixture
def portal_data():
    owner = User.objects.create_superuser(
        email="owner@example.com",
        password="Owner-password-2026!",
    )
    teacher_user = User.objects.create_user(
        email="teacher@example.com",
        password="Teacher-password-2026!",
        first_name="Daniel",
        last_name="Otieno",
        role=User.Role.TEACHER,
    )
    other_teacher_user = User.objects.create_user(
        email="other-teacher@example.com",
        password="Teacher-password-2026!",
        role=User.Role.TEACHER,
    )
    teacher = TeacherProfile.objects.create(user=teacher_user)
    other_teacher = TeacherProfile.objects.create(user=other_teacher_user)

    student_user = User.objects.create_user(
        email="student@example.com",
        password="Student-password-2026!",
        role=User.Role.STUDENT,
    )
    other_student_user = User.objects.create_user(
        email="other-student@example.com",
        password="Student-password-2026!",
        role=User.Role.STUDENT,
    )
    unlinked_student_user = User.objects.create_user(
        email="unlinked-student@example.com",
        password="Student-password-2026!",
        role=User.Role.STUDENT,
    )
    student = Student.objects.create(
        user=student_user,
        first_name="Amina",
        last_name="Kamau",
        grade_level="Grade 6",
    )
    other_student = Student.objects.create(
        user=other_student_user,
        first_name="Brian",
        last_name="Omondi",
        grade_level="Grade 7",
    )

    subject = Subject.objects.create(name="Mathematics")
    TeacherSubject.objects.create(teacher=teacher, subject=subject)
    TeacherSubject.objects.create(teacher=other_teacher, subject=subject)
    term = AcademicTerm.objects.create(
        name="Current term",
        starts_on=date.today(),
        ends_on=date.today() + timedelta(days=90),
    )
    own_class = ClassGroup.objects.create(
        name="Grade 6 Mathematics",
        subject=subject,
        grade_level="Grade 6",
        term=term,
        primary_teacher=teacher,
        default_meeting_url="https://meet.example.com/grade-6",
        created_by=owner,
    )
    other_class = ClassGroup.objects.create(
        name="Grade 7 Mathematics",
        subject=subject,
        grade_level="Grade 7",
        term=term,
        primary_teacher=other_teacher,
        default_meeting_url="https://meet.example.com/grade-7",
        created_by=owner,
    )
    ScheduleRule.objects.create(
        class_group=own_class,
        weekday=ScheduleRule.Weekday.MONDAY,
        start_time="16:00",
        end_time="17:00",
    )
    ScheduleRule.objects.create(
        class_group=other_class,
        weekday=ScheduleRule.Weekday.TUESDAY,
        start_time="16:00",
        end_time="17:00",
    )
    ClassEnrollment.objects.create(
        class_group=own_class,
        student=student,
        financial_status=ClassEnrollment.FinancialStatus.PENDING,
    )
    ClassEnrollment.objects.create(class_group=other_class, student=other_student)

    return {
        "owner": owner,
        "teacher_user": teacher_user,
        "other_teacher_user": other_teacher_user,
        "student_user": student_user,
        "other_student_user": other_student_user,
        "unlinked_student_user": unlinked_student_user,
        "student": student,
        "other_student": other_student,
        "own_class": own_class,
        "other_class": other_class,
    }


def test_teacher_portal_only_returns_assigned_classes_and_rosters(portal_data):
    response = client_for(portal_data["teacher_user"]).get(
        "/api/v1/portal/teacher/classes/?page_size=100"
    )

    assert response.status_code == 200
    results = response.json()["results"]
    assert [item["id"] for item in results] == [portal_data["own_class"].id]
    assert results[0]["roster"] == [
        {
            "id": portal_data["student"].id,
            "full_name": "Amina Kamau",
            "grade_level": "Grade 6",
            "status": Student.Status.ACTIVE,
        }
    ]

    unrelated = client_for(portal_data["teacher_user"]).get(
        f"/api/v1/portal/teacher/classes/{portal_data['other_class'].id}/"
    )
    assert unrelated.status_code == 404


def test_teacher_can_update_only_an_assigned_class_meeting_link(portal_data):
    client = client_for(portal_data["teacher_user"])
    own_update = client.patch(
        f"/api/v1/portal/teacher/classes/{portal_data['own_class'].id}/meeting-link/",
        {"default_meeting_url": "https://meet.example.com/updated"},
        format="json",
    )
    invalid_update = client.patch(
        f"/api/v1/portal/teacher/classes/{portal_data['own_class'].id}/meeting-link/",
        {"default_meeting_url": "http://insecure.example.com"},
        format="json",
    )
    unrelated_update = client.patch(
        f"/api/v1/portal/teacher/classes/{portal_data['other_class'].id}/meeting-link/",
        {"default_meeting_url": "https://meet.example.com/not-allowed"},
        format="json",
    )

    assert own_update.status_code == 200
    assert invalid_update.status_code == 400
    assert unrelated_update.status_code == 404
    portal_data["own_class"].refresh_from_db()
    portal_data["other_class"].refresh_from_db()
    assert portal_data["own_class"].default_meeting_url == "https://meet.example.com/updated"
    assert portal_data["other_class"].default_meeting_url == "https://meet.example.com/grade-7"


def test_teacher_summary_is_scoped_to_assigned_classes(portal_data):
    response = client_for(portal_data["teacher_user"]).get("/api/v1/portal/teacher/summary/")

    assert response.status_code == 200
    assert response.json() == {
        "assigned_classes": 1,
        "active_students": 1,
        "weekly_lessons": 1,
        "missing_meeting_links": 0,
    }


def test_student_portal_only_returns_own_enrollments_without_raw_meeting_url(portal_data):
    response = client_for(portal_data["student_user"]).get(
        "/api/v1/portal/student/classes/?page_size=100"
    )

    assert response.status_code == 200
    results = response.json()["results"]
    assert [item["id"] for item in results] == [portal_data["own_class"].id]
    assert results[0]["financial_status"] == ClassEnrollment.FinancialStatus.PENDING
    assert results[0]["meeting_ready"] is True
    assert "default_meeting_url" not in results[0]

    unrelated = client_for(portal_data["student_user"]).get(
        f"/api/v1/portal/student/classes/{portal_data['other_class'].id}/"
    )
    assert unrelated.status_code == 404


def test_student_summary_is_scoped_to_linked_student(portal_data):
    response = client_for(portal_data["student_user"]).get("/api/v1/portal/student/summary/")

    assert response.status_code == 200
    assert response.json() == {
        "student_name": "Amina Kamau",
        "grade_level": "Grade 6",
        "active_classes": 1,
        "weekly_lessons": 1,
        "pending_balance_classes": 1,
        "access_restricted": False,
        "restriction_reason": None,
    }


@pytest.mark.parametrize("portal", ["teacher", "student"])
def test_unlinked_student_account_cannot_access_a_portal(portal_data, portal):
    response = client_for(portal_data["unlinked_student_user"]).get(
        f"/api/v1/portal/{portal}/classes/"
    )
    assert response.status_code == 403


def test_student_cannot_use_teacher_meeting_link_action(portal_data):
    response = client_for(portal_data["student_user"]).patch(
        f"/api/v1/portal/teacher/classes/{portal_data['own_class'].id}/meeting-link/",
        {"default_meeting_url": "https://meet.example.com/not-allowed"},
        format="json",
    )
    assert response.status_code == 403


@pytest.mark.parametrize(
    ("role_key", "endpoint"),
    [
        ("owner", "/api/v1/portal/teacher/classes/"),
        ("student_user", "/api/v1/portal/teacher/classes/"),
        ("owner", "/api/v1/portal/student/classes/"),
        ("teacher_user", "/api/v1/portal/student/classes/"),
    ],
)
def test_portal_role_boundaries(portal_data, role_key, endpoint):
    assert client_for(portal_data[role_key]).get(endpoint).status_code == 403


def test_student_invitation_requires_and_links_a_specific_student(portal_data):
    student = Student.objects.create(
        first_name="Carol",
        last_name="Wanjiku",
        grade_level="Grade 5",
    )
    client = client_for(portal_data["owner"])
    missing_student = client.post(
        "/api/v1/users/invitations/",
        {
            "email": "carol@example.com",
            "role": User.Role.STUDENT,
        },
        format="json",
    )
    issued = client.post(
        "/api/v1/users/invitations/",
        {
            "email": "carol@example.com",
            "role": User.Role.STUDENT,
            "student_id": student.id,
        },
        format="json",
    )

    assert missing_student.status_code == 400
    assert issued.status_code == 201, issued.json()
    student.refresh_from_db()
    assert student.user.email == "carol@example.com"
    assert student.user.is_active is False

    token = issued.json()["acceptance_url"].rsplit("/", maxsplit=1)[-1]
    accepted = APIClient().post(
        f"/api/v1/auth/invitations/{token}/accept/",
        {
            "password": "Student-password-2026!",
            "password_confirmation": "Student-password-2026!",
        },
        format="json",
    )
    assert accepted.status_code == 200
    student.user.refresh_from_db()
    me = client_for(student.user).get("/api/v1/auth/me/")
    assert me.status_code == 200
    assert me.json()["role"] == User.Role.STUDENT
    assert me.json()["profile_id"] == student.id


def test_student_portal_status_is_visible_to_admin(portal_data):
    response = client_for(portal_data["owner"]).get(
        f"/api/v1/students/{portal_data['student'].id}/"
    )

    assert response.status_code == 200
    assert response.json()["portal_status"] == "ACTIVE"
    assert response.json()["account_email"] == "student@example.com"
