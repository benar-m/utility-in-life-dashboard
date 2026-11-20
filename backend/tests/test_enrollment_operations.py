from datetime import date, timedelta
from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.academics.models import (
    AcademicTerm,
    ClassEnrollment,
    ClassGroup,
    Subject,
    TeacherSubject,
)
from apps.accounts.models import Student, TeacherProfile, User
from apps.campaigns.models import EnrollmentApplication, EnrollmentCampaign

pytestmark = pytest.mark.django_db


def client_for(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.fixture
def operations_data():
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
    return {
        "owner": owner,
        "teacher_user": teacher_user,
        "class_group": class_group,
    }


def public_application_payload(email="guardian@example.com"):
    return {
        "first_name": "Amina",
        "last_name": "Kamau",
        "grade_level": "Grade 6",
        "student_email": "amina@example.com",
        "guardian_name": "Mary Kamau",
        "guardian_email": email,
        "guardian_phone": "+254700000000",
        "notes": "Prefers afternoon lessons.",
    }


def test_class_enrollment_link_is_reused_and_public_metadata_is_safe(operations_data):
    owner_client = client_for(operations_data["owner"])
    class_id = operations_data["class_group"].id

    first = owner_client.post(f"/api/v1/classes/{class_id}/enrollment-link/", {}, format="json")
    second = owner_client.post(f"/api/v1/classes/{class_id}/enrollment-link/", {}, format="json")

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json() == second.json()
    assert EnrollmentCampaign.objects.count() == 1

    public_id = EnrollmentCampaign.objects.get().public_id
    public = APIClient().get(f"/api/v1/public/enrollment/{public_id}/")
    assert public.status_code == 200
    assert public.json()["target_class"] == {
        "name": "Grade 6 Mathematics",
        "subject": "Mathematics",
        "grade_level": "Grade 6",
        "cost_amount": "1500.00",
        "currency": "KES",
        "is_full": False,
        "teacher": "",
        "schedule": [],
    }
    assert "created_by" not in public.json()

    denied = client_for(operations_data["teacher_user"]).post(
        f"/api/v1/classes/{class_id}/enrollment-link/",
        {},
        format="json",
    )
    assert denied.status_code == 403


def test_class_application_requires_review_then_creates_student_and_enrollment(operations_data):
    owner_client = client_for(operations_data["owner"])
    class_group = operations_data["class_group"]
    owner_client.post(
        f"/api/v1/classes/{class_group.id}/enrollment-link/",
        {},
        format="json",
    )
    campaign = EnrollmentCampaign.objects.get()

    submitted = APIClient().post(
        f"/api/v1/public/enrollment/{campaign.public_id}/applications/",
        public_application_payload(),
        format="json",
    )
    duplicate = APIClient().post(
        f"/api/v1/public/enrollment/{campaign.public_id}/applications/",
        public_application_payload(),
        format="json",
    )

    assert submitted.status_code == 201, submitted.json()
    assert duplicate.status_code == 400
    assert Student.objects.count() == 0
    assert ClassEnrollment.objects.count() == 0

    application = EnrollmentApplication.objects.get()
    accepted = owner_client.post(
        f"/api/v1/applications/{application.id}/accept/",
        {},
        format="json",
    )
    accepted_again = owner_client.post(
        f"/api/v1/applications/{application.id}/accept/",
        {},
        format="json",
    )

    assert accepted.status_code == 200, accepted.json()
    assert accepted_again.status_code == 200
    assert Student.objects.count() == 1
    assert ClassEnrollment.objects.count() == 1
    student = Student.objects.get()
    enrollment = ClassEnrollment.objects.get()
    assert student.user is None
    assert enrollment.student == student
    assert enrollment.class_group == class_group
    assert enrollment.financial_status == ClassEnrollment.FinancialStatus.PENDING
    assert enrollment.balance_due == Decimal("1500.00")
    application.refresh_from_db()
    assert application.status == EnrollmentApplication.Status.ACCEPTED
    assert application.created_student == student


def test_general_campaign_acceptance_creates_student_without_class(operations_data):
    owner_client = client_for(operations_data["owner"])
    created = owner_client.post(
        "/api/v1/campaigns/",
        {
            "title": "September intake",
            "description": "General enrollment",
            "status": EnrollmentCampaign.Status.OPEN,
        },
        format="json",
    )
    assert created.status_code == 201, created.json()
    campaign = EnrollmentCampaign.objects.get()

    submitted = APIClient().post(
        f"/api/v1/public/enrollment/{campaign.public_id}/applications/",
        public_application_payload(),
        format="json",
    )
    application_id = submitted.json()["id"]
    accepted = owner_client.post(
        f"/api/v1/applications/{application_id}/accept/",
        {},
        format="json",
    )

    assert accepted.status_code == 200
    assert Student.objects.count() == 1
    assert ClassEnrollment.objects.count() == 0


def test_rejected_application_cannot_later_be_accepted(operations_data):
    owner_client = client_for(operations_data["owner"])
    campaign = EnrollmentCampaign.objects.create(
        title="General intake",
        created_by=operations_data["owner"],
    )
    application = EnrollmentApplication.objects.create(
        campaign=campaign,
        **public_application_payload(),
    )

    rejected = owner_client.post(
        f"/api/v1/applications/{application.id}/reject/",
        {"reason": "Outside the current age group."},
        format="json",
    )
    accepted = owner_client.post(
        f"/api/v1/applications/{application.id}/accept/",
        {},
        format="json",
    )

    assert rejected.status_code == 200
    assert accepted.status_code == 400
    assert Student.objects.count() == 0
    application.refresh_from_db()
    assert application.rejection_reason == "Outside the current age group."


def test_setting_class_cost_updates_only_mutable_financial_records(operations_data):
    class_group = operations_data["class_group"]
    students = [
        Student.objects.create(
            first_name=f"Student{index}",
            last_name="Example",
            grade_level="Grade 6",
        )
        for index in range(4)
    ]
    statuses = [
        ClassEnrollment.FinancialStatus.NOT_CONFIGURED,
        ClassEnrollment.FinancialStatus.PENDING,
        ClassEnrollment.FinancialStatus.CLEARED,
        ClassEnrollment.FinancialStatus.WAIVED,
    ]
    enrollments = [
        ClassEnrollment.objects.create(
            class_group=class_group,
            student=student,
            financial_status=financial_status,
            balance_due=Decimal("0.00") if financial_status != "NOT_CONFIGURED" else None,
        )
        for student, financial_status in zip(students, statuses, strict=True)
    ]

    response = client_for(operations_data["owner"]).post(
        f"/api/v1/classes/{class_group.id}/cost/",
        {
            "cost_amount": "2200.00",
            "currency": "kes",
            "apply_to_active_enrollments": True,
        },
        format="json",
    )

    assert response.status_code == 200, response.json()
    class_group.refresh_from_db()
    assert class_group.cost_amount == Decimal("2200.00")
    assert class_group.currency == "KES"
    for enrollment in enrollments:
        enrollment.refresh_from_db()
    assert enrollments[0].financial_status == ClassEnrollment.FinancialStatus.PENDING
    assert enrollments[0].balance_due == Decimal("2200.00")
    assert enrollments[1].balance_due == Decimal("2200.00")
    assert enrollments[2].financial_status == ClassEnrollment.FinancialStatus.CLEARED
    assert enrollments[2].balance_due == Decimal("0.00")
    assert enrollments[3].financial_status == ClassEnrollment.FinancialStatus.WAIVED
    assert enrollments[3].balance_due == Decimal("0.00")


def test_student_assignment_is_idempotent_cost_aware_and_capacity_checked(operations_data):
    class_group = operations_data["class_group"]
    class_group.capacity = 1
    class_group.save(update_fields=("capacity",))
    first_student = Student.objects.create(
        first_name="Amina",
        last_name="Kamau",
        grade_level="Grade 6",
    )
    second_student = Student.objects.create(
        first_name="Brian",
        last_name="Omondi",
        grade_level="Grade 6",
    )
    client = client_for(operations_data["owner"])

    assigned = client.post(
        f"/api/v1/students/{first_student.id}/assign/",
        {"class_id": class_group.id},
        format="json",
    )
    assigned_again = client.post(
        f"/api/v1/students/{first_student.id}/assign/",
        {"class_id": class_group.id},
        format="json",
    )
    full = client.post(
        f"/api/v1/students/{second_student.id}/assign/",
        {"class_id": class_group.id},
        format="json",
    )

    assert assigned.status_code == 200, assigned.json()
    assert assigned_again.status_code == 200
    assert full.status_code == 400
    assert ClassEnrollment.objects.count() == 1
    enrollment = ClassEnrollment.objects.get()
    assert enrollment.balance_due == Decimal("1500.00")
    assert enrollment.financial_status == ClassEnrollment.FinancialStatus.PENDING


def test_archiving_student_preserves_record_withdraws_classes_and_disables_login(
    operations_data,
):
    user = User.objects.create_user(
        email="student@example.com",
        password="Student-password-2026!",
        role=User.Role.STUDENT,
    )
    student = Student.objects.create(
        user=user,
        first_name="Amina",
        last_name="Kamau",
        grade_level="Grade 6",
    )
    enrollment = ClassEnrollment.objects.create(
        class_group=operations_data["class_group"],
        student=student,
    )

    response = client_for(operations_data["owner"]).post(
        f"/api/v1/students/{student.id}/archive/",
        {},
        format="json",
    )

    assert response.status_code == 200
    student.refresh_from_db()
    user.refresh_from_db()
    enrollment.refresh_from_db()
    assert Student.objects.filter(pk=student.pk).exists()
    assert student.status == Student.Status.INACTIVE
    assert user.is_active is False
    assert enrollment.status == ClassEnrollment.Status.WITHDRAWN


@pytest.mark.parametrize(
    "endpoint",
    [
        "/api/v1/campaigns/",
        "/api/v1/applications/",
    ],
)
def test_campaign_operations_are_admin_only(operations_data, endpoint):
    assert client_for(operations_data["teacher_user"]).get(endpoint).status_code == 403
