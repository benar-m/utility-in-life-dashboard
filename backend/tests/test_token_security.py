import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User

pytestmark = pytest.mark.django_db


@pytest.fixture
def owner():
    return User.objects.create_superuser(
        email="owner@example.com",
        password="Owner-password-2026!",
    )


def csrf_client():
    client = APIClient(enforce_csrf_checks=True)
    response = client.get("/api/v1/auth/csrf/")
    return client, response.json()["csrf_token"]


def login(client, csrf_token, owner):
    return client.post(
        "/api/v1/auth/login/",
        {"email": owner.email, "password": "Owner-password-2026!"},
        format="json",
        HTTP_X_CSRFTOKEN=csrf_token,
    )


def test_refresh_rotation_blacklists_the_previous_token(owner):
    client, csrf_token = csrf_client()
    assert login(client, csrf_token, owner).status_code == 200
    old_refresh = client.cookies["uil_refresh"].value

    refreshed = client.post(
        "/api/v1/auth/refresh/",
        format="json",
        HTTP_X_CSRFTOKEN=csrf_token,
    )
    assert refreshed.status_code == 200
    assert client.cookies["uil_refresh"].value != old_refresh

    replay_client, replay_csrf = csrf_client()
    replay_client.cookies["uil_refresh"] = old_refresh
    replay = replay_client.post(
        "/api/v1/auth/refresh/",
        format="json",
        HTTP_X_CSRFTOKEN=replay_csrf,
    )
    assert replay.status_code == 401


def test_logout_blacklists_refresh_token(owner):
    client, csrf_token = csrf_client()
    assert login(client, csrf_token, owner).status_code == 200
    refresh_token = client.cookies["uil_refresh"].value

    logged_out = client.post(
        "/api/v1/auth/logout/",
        format="json",
        HTTP_X_CSRFTOKEN=csrf_token,
    )
    assert logged_out.status_code == 204

    replay_client, replay_csrf = csrf_client()
    replay_client.cookies["uil_refresh"] = refresh_token
    replay = replay_client.post(
        "/api/v1/auth/refresh/",
        format="json",
        HTTP_X_CSRFTOKEN=replay_csrf,
    )
    assert replay.status_code == 401
