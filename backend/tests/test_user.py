import pytest
from django.db import IntegrityError, transaction

from apps.accounts.models import User

pytestmark = pytest.mark.django_db


def test_user_manager_normalizes_email():
    user = User.objects.create_user(email="  Person@Example.COM ", password="test-password")

    assert user.email == "person@example.com"
    assert user.check_password("test-password")


def test_email_is_case_insensitively_unique():
    User.objects.create_user(email="person@example.com", password="test-password")

    with pytest.raises(IntegrityError), transaction.atomic():
        User.objects.create_user(email="PERSON@example.com", password="test-password")


def test_superuser_is_an_owner():
    user = User.objects.create_superuser(email="owner@example.com", password="test-password")

    assert user.role == User.Role.OWNER
    assert user.is_staff is True
    assert user.is_superuser is True
