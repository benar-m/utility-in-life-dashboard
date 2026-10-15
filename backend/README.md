# Utility in Life backend

This directory contains the Django REST API. Local development uses SQLite by default to keep setup light. CI and production must use PostgreSQL through `DATABASE_URL`.

For the Docker Compose, Nginx, and Let's Encrypt production deployment, see [`docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md).

## Local setup

From this directory:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
cp .env.example .env
python manage.py migrate
python manage.py runserver
```

The API is available at `http://127.0.0.1:8000/api/v1/`. The local OpenAPI UI is at `http://127.0.0.1:8000/api/v1/docs/`.

Create the first owner before signing into the React dashboard:

```bash
python manage.py createsuperuser
```

Then start the frontend from the repository root with `npm run dev`. Its local `/api` requests are proxied to Django on port 8000, so no extra frontend environment configuration is required.

The integrated admin slice currently provides:

- Secure login, refresh-cookie rotation, logout, and session restoration
- Owner/admin invitation issuance with role enforcement, expiring one-time links, and password setup
- Dashboard totals
- Student and primary-guardian creation/listing
- Teacher invitation, contact, subject assignment, activation, and listing
- A class wizard covering subject, term, teacher, recurring timetable, meeting URL, capacity, and initial enrollment
- A recurring weekly calendar projection
- A teacher portal with scoped dashboard totals, assigned rosters, timetable, and meeting-link management
- A student portal with scoped dashboard totals, enrolled classes, timetable, and financial-status visibility
- Admin billing operations for invoice generation, PayHero M-Pesa prompts, manual cash/bank records, receipts, reconciliation, and late-payment restrictions
- A student Payments portal scoped to the linked student record

Dated lesson sessions, secure joining, and attendance remain later implementation phases.

## Payments

Production requires `PAYMENT_GATEWAY=payhero`; Django refuses to start in production with the mock adapter selected. The mock adapter is retained only for local/test workflows and tests explicitly pin it so they cannot send a live prompt.

1. Set a class cost from the admin Classes page. New class assignments receive an invoice automatically.
2. Open Payments and select **Generate class invoices** to backfill or refresh unpaid class invoices.
3. A student or authorized administrator can request an M-Pesa STK prompt. Production sends it through PayHero; the student approves it on their phone.
4. If money was already received offline, an administrator can choose **Record cash or bank payment**. Bank transfer records require a bank reference; cash can use an optional reference. The operation issues a receipt and updates the invoice and enrollment balance without sending a prompt.
5. Admins can run reconciliation, void unpaid invoices, and apply overdue restrictions. Refunds for PayHero payments must be processed in PayHero; this application does not mark a provider refund before an external reversal is confirmed.
6. Students use `/student/payments` to see only their invoices and receipts. This page stays available while class access is restricted.

### PayHero M-Pesa STK prompts

The PayHero adapter sends `POST https://backend.payhero.co.ke/api/v2/payments` using HTTP Basic Auth and the configured channel ID. See PayHero's [STK request documentation](https://docs.payhero.co.ke/docs/post-initiate-mpesa-stk-push-request) and [callback format](https://docs.payhero.co.ke/docs/payment-callback). Store credentials only in `backend/.env` locally or in the deployment secret store; never commit them. Prompt amounts must be whole KES values.

Configure `PAYHERO_CALLBACK_BASE_URL` as the public HTTPS prefix ending in `/api/v1/payments/mpesa/payhero`, for example `https://api.example.com/api/v1/payments/mpesa/payhero`. PayHero calls back to a unique tokenized URL below that prefix. The token is random per attempt and only its hash is stored. The app checks the token, external reference, checkout ID, amount, and phone before creating a payment and receipt. Tests stub the HTTP call and never contact PayHero or initiate a prompt.

The authenticated payment-attempt endpoint supports polling while PayHero processes the prompt. Provider-side refunds and automated transaction-status reconciliation are not implemented; record cash/bank payments only after receiving the funds.

## Browser authentication and invitations

The React app keeps the short-lived access token in memory. Django stores only the rotating refresh token in an `HttpOnly`, `SameSite=Lax` cookie. On a browser reload, React calls `/api/v1/auth/refresh/` to restore the session. Login, refresh, logout, and invitation acceptance first fetch `/api/v1/auth/csrf/` and echo its token in `X-CSRFToken`.

Owners and administrators invite a teacher from the Teachers page. Django creates an inactive account and returns the acceptance URL once so it can be copied. The raw invitation token is never stored in the database; only its SHA-256 digest is saved. The default local email backend also writes the link to the Django console. The invited person sets their own password at `/accept-invitation/:token`, after which the link cannot be reused.

An owner may invite administrators, teachers, guardians, and students. An administrator may invite teachers, guardians, and students. Neither role can invite another owner. Invitation lifetime and request throttles are configurable in `.env.example`.

## How a student gets portal access

A student record and a student login are deliberately separate. Creating a student manually—or later accepting a public campaign application—does not silently create credentials.

1. An owner or administrator creates or approves the student record.
2. The administrator enrolls that student record into the appropriate classes.
3. On the admin **Students** page, select **Invite** beside that specific student and enter the student's unique login email.
4. Django creates an inactive `STUDENT` user, links it one-to-one to that student record, and issues a 48-hour activation link.
5. The student opens the link, chooses a password, and can then sign in. Login redirects to `/student`.
6. Student portal APIs resolve the linked student record from the authenticated user and return only that student's active enrollments.

Re-inviting before activation revokes the previous link. An active student account cannot be reassigned through the invitation form. The student's email must be unique and cannot reuse an existing guardian account email because each login has one authoritative role.

For younger learners without their own email, do not share a guardian's credentials or reuse the guardian email as a student login. The intended flow is a guardian portal that acts for linked children; that portal remains a later slice.

Teachers can set a class's default meeting link now, but student payloads expose only whether a link is ready. The raw URL and enabled **Attend** action remain withheld until dated lesson sessions and secure join-window checks are implemented.

## Verification

Run the complete backend check from this directory with:

```bash
make verify
```

Or run each check independently:

```bash
.venv/bin/ruff check .
.venv/bin/ruff format --check .
.venv/bin/pytest
.venv/bin/python manage.py check
.venv/bin/python manage.py spectacular --validate --file /tmp/utility-in-life-openapi.yaml
```

## Settings

`manage.py` uses `config.settings.local` unless `DJANGO_SETTINGS_MODULE` is already set. Gunicorn/WSGI and ASGI default to `config.settings.production`, so a production process cannot silently boot with development settings.

Important environment variables are documented in `.env.example`. Production additionally requires:

- A strong `DJANGO_SECRET_KEY`
- Explicit `DJANGO_ALLOWED_HOSTS`
- An explicit `FRONTEND_URL`
- A PostgreSQL `DATABASE_URL`
- HTTPS-aware proxy and cookie configuration
- A random `MPESA_CALLBACK_TOKEN` of at least 32 characters

`manage.py check --deploy` will continue to warn about HSTS subdomains and preload until `DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS=true` and `DJANGO_SECURE_HSTS_PRELOAD=true` are deliberately enabled. Enable them only after every relevant subdomain is permanently HTTPS-capable.

Do not commit `backend/.env`, the SQLite database, generated static files, or access tokens.
