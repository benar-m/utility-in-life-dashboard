import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.campaigns.models import ProgramRegistration

pytestmark = pytest.mark.django_db

URL = "/api/v1/public/registrations/"


def valid_payload(**overrides):
    payload = {
        "student_name": "Amani Otieno",
        "parent_name": "Grace Otieno",
        "level": "FORM_3",
        "study_mode": "ONLINE_GROUP",
        "subjects": ["MATHEMATICS", "CHEMISTRY"],
        "parent_phone": "0712 345 678",
    }
    payload.update(overrides)
    return payload


def test_public_registration_is_stored_without_login():
    response = APIClient().post(URL, valid_payload(), format="json")

    assert response.status_code == 201
    registration = ProgramRegistration.objects.get()
    assert registration.parent_phone == "0712345678"
    assert registration.status == ProgramRegistration.Status.NEW


@pytest.mark.parametrize(
    "overrides, field",
    [
        ({"parent_phone": "12345"}, "parent_phone"),
        ({"level": "OTHER", "level_other": ""}, "level_other"),
        ({"subjects": [], "subjects_other": ""}, "subjects"),
        ({"subjects": ["ASTROLOGY"]}, "subjects"),
    ],
)
def test_public_registration_rejects_invalid_input(overrides, field):
    response = APIClient().post(URL, valid_payload(**overrides), format="json")

    assert response.status_code == 400
    assert field in response.data


def test_other_subject_alone_is_accepted():
    response = APIClient().post(
        URL,
        valid_payload(subjects=[], subjects_other="History"),
        format="json",
    )

    assert response.status_code == 201


def test_registrations_list_requires_admin():
    APIClient().post(URL, valid_payload(), format="json")
    assert APIClient().get("/api/v1/registrations/").status_code in (401, 403)

    owner = User.objects.create_superuser(
        email="owner@example.com", password="Owner-password-2026!"
    )
    client = APIClient()
    client.force_authenticate(owner)
    response = client.get("/api/v1/registrations/")
    assert response.status_code == 200
    assert response.data["results"][0]["student_name"] == "Amani Otieno"


def test_staff_can_update_registration_status_but_nothing_else():
    APIClient().post(URL, valid_payload(), format="json")
    registration = ProgramRegistration.objects.get()
    owner = User.objects.create_superuser(
        email="owner@example.com", password="Owner-password-2026!"
    )
    client = APIClient()
    client.force_authenticate(owner)

    response = client.patch(
        f"/api/v1/registrations/{registration.id}/",
        {"status": "CONTACTED", "student_name": "Changed"},
        format="json",
    )

    assert response.status_code == 200
    assert response.data["status"] == "CONTACTED"
    registration.refresh_from_db()
    assert registration.student_name == "Amani Otieno"
    assert APIClient().patch(
        f"/api/v1/registrations/{registration.id}/", {"status": "ENROLLED"}
    ).status_code in (401, 403)


def test_registration_options_match_the_model():
    response = APIClient().get("/api/v1/public/registrations/options/")

    assert response.status_code == 200
    levels = {level["value"]: level for level in response.data["levels"]}
    assert levels["FORM_3"] == {"value": "FORM_3", "label": "Form 3", "group": "8-4-4 (KCSE)"}
    assert levels["OTHER"]["group"] is None
    assert [mode["value"] for mode in response.data["study_modes"]] == [
        value for value, _ in ProgramRegistration.StudyMode.choices
    ]
    assert {"value": "MATHEMATICS", "label": "Mathematics"} in response.data["subjects"]


def test_public_site_shows_contact_and_current_program_only(settings):
    from datetime import timedelta

    from django.utils import timezone

    from apps.campaigns.models import Program

    settings.PUBLIC_CONTACT_PHONE = "0700 000 000"
    today = timezone.localdate()
    Program.objects.create(
        title="Past", starts_on=today - timedelta(days=60), ends_on=today - timedelta(days=30)
    )
    Program.objects.create(
        title="Hidden", starts_on=today, ends_on=today + timedelta(days=5), is_published=False
    )
    Program.objects.create(
        title="Holiday", starts_on=today - timedelta(days=1), ends_on=today + timedelta(days=30)
    )

    response = APIClient().get("/api/v1/public/site/")

    assert response.status_code == 200
    assert response.data["contact_phone"] == "0700 000 000"
    assert response.data["program"]["title"] == "Holiday"
    assert response.data["program"]["status"] == "running"
