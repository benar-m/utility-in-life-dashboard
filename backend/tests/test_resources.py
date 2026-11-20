from datetime import date, timedelta
from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.academics.models import AcademicTerm, ClassEnrollment, ClassGroup, Subject
from apps.accounts.models import Student, TeacherProfile, User
from apps.resources.models import Resource

pytestmark = pytest.mark.django_db


def access_url(resource):
    return f"/api/v1/resources/{resource.id}/access/"


def client_for(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.fixture
def library():
    owner = User.objects.create_superuser(
        email="owner@example.com", password="Owner-password-2026!"
    )
    biology = Subject.objects.create(name="Biology")
    chemistry = Subject.objects.create(name="Chemistry")
    teacher = TeacherProfile.objects.create(
        user=User.objects.create_user(
            email="teacher@example.com",
            password="Teacher-password-2026!",
            role=User.Role.TEACHER,
        )
    )
    biology_class = ClassGroup.objects.create(
        name="Form 3 Biology",
        subject=biology,
        grade_level="Form 3",
        term=AcademicTerm.objects.create(
            name="Holiday",
            starts_on=date.today(),
            ends_on=date.today() + timedelta(days=40),
        ),
        primary_teacher=teacher,
        created_by=owner,
    )
    student_user = User.objects.create_user(
        email="student@example.com",
        password="Student-password-2026!",
        role=User.Role.STUDENT,
    )
    student = Student.objects.create(
        first_name="Amina", last_name="Kamau", grade_level="Form 3", user=student_user
    )
    ClassEnrollment.objects.create(class_group=biology_class, student=student)

    def resource(title, subject, price):
        return Resource.objects.create(
            title=title,
            subject=subject,
            price_amount=price,
            download_url=f"https://drive.example.com/{title.lower().replace(' ', '-')}",
            is_published=True,
            created_by=owner,
        )

    return {
        "student": student_user,
        "outsider": User.objects.create_user(
            email="outsider@example.com",
            password="Outsider-password-2026!",
            role=User.Role.STUDENT,
        ),
        "free": resource("Free notes", chemistry, None),
        "paid_biology": resource("Biology paper", biology, Decimal("200.00")),
        "paid_chemistry": resource("Chemistry paper", chemistry, Decimal("200.00")),
    }


def test_public_catalog_never_exposes_download_links(library):
    response = APIClient().get("/api/v1/public/catalog/")

    assert response.status_code == 200
    assert len(response.data["resources"]) == 3
    assert "drive.example.com" not in str(response.data)


def test_resource_access_requires_sign_in(library):
    response = APIClient().get(access_url(library["free"]))

    assert response.status_code in (401, 403)


def test_free_resource_opens_for_any_signed_in_user(library):
    response = client_for(library["outsider"]).get(access_url(library["free"]))

    assert response.status_code == 200
    assert response.data["download_url"].endswith("/free-notes")


def test_paid_resource_opens_only_for_students_enrolled_in_that_subject(library):
    student = client_for(library["student"])

    assert student.get(access_url(library["paid_biology"])).status_code == 200
    assert student.get(access_url(library["paid_chemistry"])).status_code == 403
    outsider = client_for(library["outsider"])
    assert outsider.get(access_url(library["paid_biology"])).status_code == 403
