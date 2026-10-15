import pytest
from django.urls import reverse

pytestmark = pytest.mark.django_db


def test_openapi_schema_renders(client):
    response = client.get(reverse("schema"), {"format": "json"})

    assert response.status_code == 200
    assert response.json()["info"]["title"] == "Utility in Life API"
    assert "/api/v1/health/" in response.json()["paths"]
