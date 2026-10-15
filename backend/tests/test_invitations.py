from datetime import timedelta

import pytest
from django.core import mail
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import TeacherProfile, User, UserInvitation

pytestmark = pytest.mark.django_db


@pytest.fixture
def owner():
    return User.objects.create_superuser(
        email="owner@example.com",
        password="Owner-password-2026!",
    )


def authenticated_client(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


def invitation_payload(email="teacher@example.com", role=User.Role.TEACHER):
    payload = {
        "full_name": "Daniel Otieno",
        "email": email,
        "phone": "+254711111111",
        "role": role,
    }
    if role == User.Role.TEACHER:
        payload["subject_names"] = ["Mathematics", "Science"]
    return payload


def issue_invitation(client, **overrides):
    payload = invitation_payload()
    payload.update(overrides)
    return client.post("/api/v1/users/invitations/", payload, format="json")


def raw_token(response):
    return response.json()["acceptance_url"].rsplit("/", maxsplit=1)[-1]


def test_teacher_invitation_is_hashed_inactive_and_delivered(
    owner,
    django_capture_on_commit_callbacks,
):
    with django_capture_on_commit_callbacks(execute=True):
        response = issue_invitation(authenticated_client(owner))

    assert response.status_code == 201, response.json()
    invitation = UserInvitation.objects.get()
    teacher = TeacherProfile.objects.select_related("user").get()
    token = raw_token(response)

    assert invitation.token_digest == UserInvitation.digest_token(token)
    assert token != invitation.token_digest
    assert invitation.status == "PENDING"
    assert teacher.status == TeacherProfile.Status.INVITED
    assert teacher.user.is_active is False
    assert teacher.user.has_usable_password() is False
    assert set(teacher.subject_links.values_list("subject__name", flat=True)) == {
        "Mathematics",
        "Science",
    }
    assert len(mail.outbox) == 1
    assert response.json()["acceptance_url"] in mail.outbox[0].body


def test_acceptance_activates_account_and_token_cannot_be_reused(owner):
    client = authenticated_client(owner)
    issued = issue_invitation(client)
    token = raw_token(issued)
    password = "Teacher-password-2026!"

    inactive_login = APIClient().post(
        "/api/v1/auth/login/",
        {"email": "teacher@example.com", "password": password},
        format="json",
    )
    assert inactive_login.status_code == 400

    accepted = APIClient().post(
        f"/api/v1/auth/invitations/{token}/accept/",
        {"password": password, "password_confirmation": password},
        format="json",
    )
    assert accepted.status_code == 200, accepted.json()

    invitation = UserInvitation.objects.get()
    teacher = TeacherProfile.objects.select_related("user").get()
    assert invitation.accepted_at is not None
    assert invitation.status == "ACCEPTED"
    assert teacher.status == TeacherProfile.Status.ACTIVE
    assert teacher.user.is_active is True
    assert teacher.user.must_change_password is False
    assert teacher.user.check_password(password)

    reused = APIClient().post(
        f"/api/v1/auth/invitations/{token}/accept/",
        {"password": password, "password_confirmation": password},
        format="json",
    )
    assert reused.status_code == 400

    login = APIClient().post(
        "/api/v1/auth/login/",
        {"email": "teacher@example.com", "password": password},
        format="json",
    )
    assert login.status_code == 200


def test_expired_invitation_cannot_be_accepted(owner):
    response = issue_invitation(authenticated_client(owner))
    token = raw_token(response)
    UserInvitation.objects.update(expires_at=timezone.now() - timedelta(seconds=1))

    accepted = APIClient().post(
        f"/api/v1/auth/invitations/{token}/accept/",
        {
            "password": "Teacher-password-2026!",
            "password_confirmation": "Teacher-password-2026!",
        },
        format="json",
    )

    assert accepted.status_code == 400
    assert User.objects.get(email="teacher@example.com").is_active is False


def test_invitation_acceptance_requires_csrf(owner):
    issued = issue_invitation(authenticated_client(owner))
    token = raw_token(issued)
    client = APIClient(enforce_csrf_checks=True)

    rejected = client.post(
        f"/api/v1/auth/invitations/{token}/accept/",
        {
            "password": "Teacher-password-2026!",
            "password_confirmation": "Teacher-password-2026!",
        },
        format="json",
    )
    assert rejected.status_code == 403

    csrf_token = client.get("/api/v1/auth/csrf/").json()["csrf_token"]
    accepted = client.post(
        f"/api/v1/auth/invitations/{token}/accept/",
        {
            "password": "Teacher-password-2026!",
            "password_confirmation": "Teacher-password-2026!",
        },
        format="json",
        HTTP_X_CSRFTOKEN=csrf_token,
    )
    assert accepted.status_code == 200


def test_reinviting_revokes_the_previous_token(owner):
    client = authenticated_client(owner)
    first = issue_invitation(client)
    second = issue_invitation(client)

    assert first.status_code == 201
    assert second.status_code == 201
    invitations = list(UserInvitation.objects.order_by("created_at"))
    assert invitations[0].status == "REVOKED"
    assert invitations[1].status == "PENDING"

    rejected = APIClient().post(
        f"/api/v1/auth/invitations/{raw_token(first)}/accept/",
        {
            "password": "Teacher-password-2026!",
            "password_confirmation": "Teacher-password-2026!",
        },
        format="json",
    )
    assert rejected.status_code == 400


def test_admin_cannot_invite_admin_but_owner_can(owner):
    admin = User.objects.create_user(
        email="admin@example.com",
        password="Admin-password-2026!",
        role=User.Role.ADMIN,
    )
    payload = invitation_payload(email="new-admin@example.com", role=User.Role.ADMIN)

    denied = authenticated_client(admin).post(
        "/api/v1/users/invitations/",
        payload,
        format="json",
    )
    allowed = authenticated_client(owner).post(
        "/api/v1/users/invitations/",
        payload,
        format="json",
    )

    assert denied.status_code == 400
    assert allowed.status_code == 201, allowed.json()


@pytest.mark.parametrize(
    ("role", "expected_status"),
    [
        (User.Role.OWNER, 200),
        (User.Role.ADMIN, 200),
        (User.Role.TEACHER, 403),
        (User.Role.GUARDIAN, 403),
        (User.Role.STUDENT, 403),
    ],
)
@pytest.mark.parametrize(
    "endpoint",
    [
        "/api/v1/students/",
        "/api/v1/teachers/",
        "/api/v1/classes/",
        "/api/v1/users/invitations/",
        "/api/v1/dashboard/summary/",
    ],
)
def test_admin_resource_list_role_matrix(role, expected_status, endpoint):
    user = User.objects.create_user(
        email=f"{role.lower()}@example.com",
        password="Role-password-2026!",
        role=role,
    )

    response = authenticated_client(user).get(endpoint)

    assert response.status_code == expected_status


@pytest.mark.parametrize(
    ("role", "expected_status"),
    [
        (User.Role.OWNER, 201),
        (User.Role.ADMIN, 201),
        (User.Role.TEACHER, 403),
        (User.Role.GUARDIAN, 403),
        (User.Role.STUDENT, 403),
    ],
)
def test_invitation_create_role_matrix(role, expected_status):
    user = User.objects.create_user(
        email=f"{role.lower()}@example.com",
        password="Role-password-2026!",
        role=role,
    )

    response = issue_invitation(authenticated_client(user))

    assert response.status_code == expected_status
