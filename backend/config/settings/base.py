import os
from datetime import timedelta
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")


def env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default

    normalized = value.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    raise ValueError(f"{name} must be a boolean value")


def env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    return default if value is None else int(value)


def env_list(name: str, default: list[str] | None = None) -> list[str]:
    value = os.getenv(name)
    if value is None:
        return list(default or [])
    return [item.strip() for item in value.split(",") if item.strip()]


SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "unsafe-local-development-key-change-me")
DEBUG = env_bool("DJANGO_DEBUG", False)
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", ["localhost", "127.0.0.1"])

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "django_filters",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "drf_spectacular",
    "apps.core",
    "apps.accounts",
    "apps.campaigns",
    "apps.academics",
    "apps.payments",
    "apps.resources",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": dj_database_url.config(
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=env_int("DATABASE_CONN_MAX_AGE", 0),
        conn_health_checks=True,
    )
}

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = os.getenv("APP_TIME_ZONE", "Africa/Nairobi")
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
PUBLIC_CONTACT_PHONE = os.getenv("PUBLIC_CONTACT_PHONE", "0720 084 756")
INVITATION_EXPIRY_HOURS = env_int("INVITATION_EXPIRY_HOURS", 48)
PAYMENT_DEFAULT_DUE_DAYS = env_int("PAYMENT_DEFAULT_DUE_DAYS", 7)
PAYMENT_GATEWAY = os.getenv("PAYMENT_GATEWAY", "mock").strip().lower()
# An M-Pesa prompt with no callback after this long stops blocking new attempts.
PAYMENT_PROMPT_TIMEOUT_SECONDS = env_int("PAYMENT_PROMPT_TIMEOUT_SECONDS", 180)
if PAYMENT_GATEWAY not in {"mock", "payhero"}:
    raise ValueError("PAYMENT_GATEWAY must be either 'mock' or 'payhero'")
MPESA_CALLBACK_TOKEN = os.getenv("MPESA_CALLBACK_TOKEN", "unsafe-local-mpesa-callback-token")
PAYHERO_API_BASE_URL = os.getenv("PAYHERO_API_BASE_URL", "https://backend.payhero.co.ke")
PAYHERO_USERNAME = os.getenv("PAYHERO_USERNAME", "")
PAYHERO_PASSWORD = os.getenv("PAYHERO_PASSWORD", "")
PAYHERO_CHANNEL_ID = os.getenv("PAYHERO_CHANNEL_ID", "")
PAYHERO_CALLBACK_BASE_URL = os.getenv("PAYHERO_CALLBACK_BASE_URL", "").rstrip("/")
PAYHERO_REQUEST_TIMEOUT = env_int("PAYHERO_REQUEST_TIMEOUT", 15)
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "noreply@utilityinlife.local")
EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND",
    "django.core.mail.backends.console.EmailBackend",
)
LOCAL_FRONTEND_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]
CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS", LOCAL_FRONTEND_ORIGINS)
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS", LOCAL_FRONTEND_ORIGINS)

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.OrderingFilter",
        "rest_framework.filters.SearchFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.StandardResultsPagination",
    "PAGE_SIZE": 25,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_RATES": {
        "auth": os.getenv("AUTH_THROTTLE_RATE", "10/min"),
        "invitation_accept": os.getenv("INVITATION_ACCEPT_THROTTLE_RATE", "20/hour"),
        "public_enrollment": os.getenv("PUBLIC_ENROLLMENT_THROTTLE_RATE", "20/hour"),
        "public_catalog": os.getenv("PUBLIC_CATALOG_THROTTLE_RATE", "30/hour"),
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env_int("JWT_ACCESS_MINUTES", 15)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env_int("JWT_REFRESH_DAYS", 7)),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": False,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_CLAIM": "user_id",
}

JWT_REFRESH_COOKIE_NAME = "uil_refresh"
JWT_REFRESH_COOKIE_SECURE = env_bool("JWT_REFRESH_COOKIE_SECURE", not DEBUG)

SPECTACULAR_SETTINGS = {
    "TITLE": "Utility in Life API",
    "DESCRIPTION": "Academic operations API for Utility in Life Empowerment.",
    "VERSION": "0.1.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SERVE_PUBLIC": DEBUG,
    "SERVE_PERMISSIONS": [
        "rest_framework.permissions.AllowAny" if DEBUG else "rest_framework.permissions.IsAdminUser"
    ],
    "ENUM_NAME_OVERRIDES": {
        "StudentStatusEnum": [
            ("PENDING", "Pending"),
            ("ACTIVE", "Active"),
            ("INACTIVE", "Inactive"),
            ("ALUMNI", "Alumni"),
        ],
        "TeacherStatusEnum": [
            ("INVITED", "Invited"),
            ("ACTIVE", "Active"),
            ("INACTIVE", "Inactive"),
        ],
        "ClassGroupStatusEnum": [
            ("DRAFT", "Draft"),
            ("ACTIVE", "Active"),
            ("PAUSED", "Paused"),
            ("ARCHIVED", "Archived"),
        ],
        "WeekdayEnum": [
            (0, "Monday"),
            (1, "Tuesday"),
            (2, "Wednesday"),
            (3, "Thursday"),
            (4, "Friday"),
            (5, "Saturday"),
            (6, "Sunday"),
        ],
    },
}

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": "apps.core.logging.JsonFormatter",
        }
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json",
        }
    },
    "root": {
        "handlers": ["console"],
        "level": os.getenv("LOG_LEVEL", "INFO"),
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": os.getenv("DJANGO_LOG_LEVEL", os.getenv("LOG_LEVEL", "INFO")),
            "propagate": False,
        }
    },
}
