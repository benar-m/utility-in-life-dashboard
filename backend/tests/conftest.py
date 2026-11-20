"""Shared fixtures: a class with an enrolled student, an invoice, and staff accounts."""

from datetime import date, timedelta
from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.academics.models import AcademicTerm, ClassGroup, Subject, TeacherSubject
from apps.academics.services import assign_student_to_class
from apps.accounts.models import Student, TeacherProfile, User
from apps.payments.models import Invoice, PaymentAttempt


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
