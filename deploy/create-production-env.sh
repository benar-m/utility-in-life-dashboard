#!/usr/bin/env sh
set -eu

umask 077

if [ -e .env.production ]; then
    printf '%s\n' "Refusing to replace existing .env.production"
    exit 1
fi

FRONTEND_ORIGIN="${FRONTEND_ORIGIN:-https://utillife.oxlabs.co.ke}"
DB_PASSWORD="$(openssl rand -hex 32)"
DJANGO_SECRET_KEY="$(openssl rand -hex 48)"
MPESA_CALLBACK_TOKEN="$(openssl rand -hex 32)"

{
    printf 'DJANGO_SETTINGS_MODULE=%s\n' 'config.settings.production'
    printf 'DJANGO_SECRET_KEY=%s\n' "$DJANGO_SECRET_KEY"
    printf 'DJANGO_DEBUG=false\n'
    printf 'DJANGO_ALLOWED_HOSTS=utilapi.oxlabs.co.ke\n'
    printf 'DATABASE_URL=postgresql://uilbackend:%s@db:5432/utilityinlife\n' "$DB_PASSWORD"
    printf 'POSTGRES_DB=utilityinlife\n'
    printf 'POSTGRES_USER=uilbackend\n'
    printf 'POSTGRES_PASSWORD=%s\n' "$DB_PASSWORD"
    printf 'FRONTEND_URL=%s\n' "$FRONTEND_ORIGIN"
    printf 'CORS_ALLOWED_ORIGINS=%s\n' "$FRONTEND_ORIGIN"
    printf 'CSRF_TRUSTED_ORIGINS=%s,https://utilapi.oxlabs.co.ke\n' "$FRONTEND_ORIGIN"
    printf 'MPESA_CALLBACK_TOKEN=%s\n' "$MPESA_CALLBACK_TOKEN"
    printf 'PAYMENT_GATEWAY=payhero\n'
    printf 'PAYHERO_API_BASE_URL=https://backend.payhero.co.ke\n'
    printf 'PAYHERO_CHANNEL_ID=8748\n'
    printf 'PAYHERO_CALLBACK_BASE_URL=https://utilapi.oxlabs.co.ke/api/v1/payments/mpesa/payhero\n'
    printf 'PAYHERO_REQUEST_TIMEOUT=15\n'
    printf 'DATABASE_CONN_MAX_AGE=60\n'
    printf 'APP_TIME_ZONE=Africa/Nairobi\n'
    printf 'DEFAULT_FROM_EMAIL=noreply@oxlabs.co.ke\n'
    printf 'EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend\n'
    printf 'JWT_REFRESH_COOKIE_SECURE=true\n'
    printf 'DJANGO_SECURE_SSL_REDIRECT=true\n'
    printf 'DJANGO_SECURE_HSTS_SECONDS=31536000\n'
    printf 'DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS=false\n'
    printf 'DJANGO_SECURE_HSTS_PRELOAD=false\n'
    printf 'LOG_LEVEL=INFO\n'
} > .env.production

printf '%s\n' "Created production environment with fresh Django, database, and callback secrets."
