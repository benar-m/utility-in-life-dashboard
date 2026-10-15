import os

from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F403

DEBUG = False


def require_environment(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise ImproperlyConfigured(f"{name} must be set in production")
    return value


production_secret_key = require_environment("DJANGO_SECRET_KEY")
if (
    production_secret_key == "unsafe-local-development-key-change-me"
    or len(production_secret_key) < 50
):
    raise ImproperlyConfigured("DJANGO_SECRET_KEY must be a strong production secret")

require_environment("DJANGO_ALLOWED_HOSTS")
require_environment("FRONTEND_URL")
require_environment("DATABASE_URL")
require_environment("CORS_ALLOWED_ORIGINS")
require_environment("CSRF_TRUSTED_ORIGINS")
if PAYMENT_GATEWAY != "payhero":  # noqa: F405
    raise ImproperlyConfigured("PAYMENT_GATEWAY must be 'payhero' in production")
production_mpesa_callback_token = require_environment("MPESA_CALLBACK_TOKEN")
if len(production_mpesa_callback_token) < 32:
    raise ImproperlyConfigured("MPESA_CALLBACK_TOKEN must contain at least 32 characters")

if PAYMENT_GATEWAY == "payhero":  # noqa: F405
    require_environment("PAYHERO_USERNAME")
    require_environment("PAYHERO_PASSWORD")
    require_environment("PAYHERO_CHANNEL_ID")
    payhero_callback_base_url = require_environment("PAYHERO_CALLBACK_BASE_URL")
    if not payhero_callback_base_url.startswith("https://"):
        raise ImproperlyConfigured("PAYHERO_CALLBACK_BASE_URL must use HTTPS")

if DATABASES["default"]["ENGINE"] != "django.db.backends.postgresql":  # noqa: F405
    raise ImproperlyConfigured("Production DATABASE_URL must use PostgreSQL")

SECURE_SSL_REDIRECT = env_bool("DJANGO_SECURE_SSL_REDIRECT", True)  # noqa: F405
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
JWT_REFRESH_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
# The SPA must echo this non-secret token in X-CSRFToken for cookie-backed auth actions.
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = "Lax"
SECURE_HSTS_SECONDS = env_int("DJANGO_SECURE_HSTS_SECONDS", 3600)  # noqa: F405
SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool(  # noqa: F405
    "DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS", False
)
SECURE_HSTS_PRELOAD = env_bool("DJANGO_SECURE_HSTS_PRELOAD", False)  # noqa: F405
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"
