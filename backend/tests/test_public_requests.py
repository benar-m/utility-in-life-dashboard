from datetime import date, timedelta

import pytest
from rest_framework.test import APIClient

from apps.academics.models import AcademicTerm, ClassGroup, Subject
from apps.accounts.models import TeacherProfile, User
from apps.campaigns.models import EnrollmentApplication
from apps.resources.models import Resource, ResourceInterest

pytestmark = pytest.mark.django_db


@pytest.fixture
def catalog():
    owner = User.objects.create_superuser(
        email="owner@example.com", password="Owner-password-2026!"
    )
    teacher = TeacherProfile.objects.create(
        user=User.objects.create_user(
            email="teacher@example.com",
            password="Teacher-password-2026!",
            role=User.Role.TEACHER,
        )
    )
    class_group = ClassGroup.objects.create(
        name="Form 3 Chemistry",
        subject=Subject.objects.create(name="Chemistry"),
        grade_level="Form 3",
        term=AcademicTerm.objects.create(
            name="Holiday", starts_on=date.today(), ends_on=date.today() + timedelta(days=40)
        ),
        primary_teacher=teacher,
        created_by=owner,
    )
    resource = Resource.objects.create(
        title="Chemistry notes",
        download_url="https://drive.example.com/notes",
        is_published=True,
        created_by=owner,
    )
    return {"class_group": class_group, "resource": resource}


def request_details(**overrides):
    details = {
        "first_name": "Amani",
        "last_name": "Otieno",
        "grade_level": "Form 3",
        "contact_email": "parent@example.com",
        "contact_phone": "0712345678",
        "preferred_times": "",
        "notes": "",
    }
    details.update(overrides)
    return details


def test_class_request_from_landing_page_becomes_an_application(catalog):
    response = APIClient().post(
        "/api/v1/public/self-enroll/",
        {"service": "CLASS", "class_id": catalog["class_group"].id, **request_details()},
        format="json",
    )

    assert response.status_code == 201
    application = EnrollmentApplication.objects.get()
    assert application.campaign.target_class == catalog["class_group"]
    assert application.status == EnrollmentApplication.Status.PENDING


def test_trip_enquiry_needs_no_class(catalog):
    response = APIClient().post(
        "/api/v1/public/self-enroll/", {"service": "EVENT", **request_details()}, format="json"
    )

    assert response.status_code == 201
    assert EnrollmentApplication.objects.get().campaign.target_class is None


def test_resource_access_request_is_recorded(catalog):
    response = APIClient().post(
        "/api/v1/public/resource-interests/",
        {
            "resource_id": catalog["resource"].id,
            "student_name": "Amani Otieno",
            "email": "parent@example.com",
            "phone": "",
            "notes": "",
        },
        format="json",
    )

    assert response.status_code == 201
    assert ResourceInterest.objects.get().resource == catalog["resource"]
