from unittest.mock import patch

import pytest
from django.db import DatabaseError
from django.urls import reverse

pytestmark = pytest.mark.django_db


def test_health_reports_database_readiness(client):
    response = client.get(reverse("health"))

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_rejects_non_get_requests(client):
    response = client.post(reverse("health"))

    assert response.status_code == 405


def test_health_reports_database_failure_without_details(client):
    with patch("apps.core.views.connection.cursor", side_effect=DatabaseError):
        response = client.get(reverse("health"))

    assert response.status_code == 503
    assert response.json() == {"status": "unavailable"}
