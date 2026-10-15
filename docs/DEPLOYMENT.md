# Utility in Life API deployment

Production target: Ubuntu EC2 at `52.23.172.171`, API domain `utilapi.oxlabs.co.ke`, frontend origin `https://utillife.oxlabs.co.ke`.

## Public API base URL

`https://utilapi.oxlabs.co.ke/api/v1`

Configure the deployed frontend with `VITE_API_BASE_URL=https://utilapi.oxlabs.co.ke/api/v1`. Do not use the relative `/api/v1` value outside the local Vite proxy.

## Layout and services

The root `compose.yaml` runs PostgreSQL 17, one memory-bounded Gunicorn worker, Nginx, and an on-demand Certbot container. PostgreSQL is private to the Compose network and persists in a named Docker volume. Django runs as a non-root user and applies migrations and static collection on startup. No local SQLite data is copied into production.

The API's credential file is generated directly on the server with `deploy/create-production-env.sh`. It creates fresh Django, database, and callback secrets with mode 0600. `.env.payhero` contains only the PayHero API credentials and is excluded from Git. Never put `.env.production`, `.env.payhero`, PEM keys, or database backups in source control.

## First deployment / certificate issuance

1. Allow inbound TCP 22 from the deployment operator, and TCP 80 and 443 from the internet in the EC2 security group. The DNS A record for `utilapi.oxlabs.co.ke` must point to this instance. Let's Encrypt HTTP-01 validation requires public port 80.
2. Install Docker Engine and the Compose plugin from Docker's official Ubuntu repository.
3. Copy the repository's `backend/`, `deploy/`, and root `compose.yaml` to `/opt/utility-in-life`, excluding `.env`, `*.pem`, local virtual environments, and `db.sqlite3`.
4. Run `deploy/create-production-env.sh` from `/opt/utility-in-life` as the service operator. Transfer only `PAYHERO_USERNAME` and `PAYHERO_PASSWORD` from the local ignored `backend/.env` to `/opt/utility-in-life/.env.payhero`, mode 0600.
5. Build and start `db` and `web` with `sudo docker compose --env-file .env.production up -d --build db web`; confirm `/api/v1/health/` reports `{"status":"ok"}` from inside the Compose network.
6. While Nginx is not running, request the first certificate: `sudo docker compose --env-file .env.production --profile certificates run --rm --no-deps -p 80:80 certbot certonly --standalone --non-interactive --register-unsafely-without-email --agree-tos -d utilapi.oxlabs.co.ke`.
7. Start Nginx with `sudo docker compose --env-file .env.production up -d nginx`. It redirects HTTP to HTTPS and proxies the API.
8. Install `deploy/utility-in-life-certbot-renew.service` and `.timer` into `/etc/systemd/system/`, enable the timer, and confirm `systemctl list-timers` shows it. The renewal script uses the Nginx-served webroot challenge and reloads Nginx after each check.
9. Create the initial organization owner with `sudo docker compose --env-file .env.production exec web python manage.py createsuperuser` if an owner has not already been provisioned. This deployment has an owner account at `admin@utillife.com`. The production database is fresh; development accounts and learner data are intentionally not imported.

If Let's Encrypt cannot validate the hostname, check DNS and the EC2 security group before retrying. The challenge uses HTTP-01, which validates through public port 80.

## Updating the frontend origin

The production allowlist starts at `https://utillife.oxlabs.co.ke` for CORS, CSRF, and invitation URLs. If the frontend is deployed under another origin, update `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS`, and `CSRF_TRUSTED_ORIGINS` in `.env.production`, then recreate the `web` service. A custom frontend subdomain under `oxlabs.co.ke` keeps the browser refresh cookie same-site; an unrelated domain may require a separate cookie/authentication design.

## Routine operations

- Logs: `sudo docker compose --env-file .env.production logs --tail=100 web nginx db`
- Restart: `sudo docker compose --env-file .env.production up -d`
- Migrations: startup applies them; check `sudo docker compose --env-file .env.production logs web` after deploys.
- Database backup: `sudo docker compose --env-file .env.production exec -T db pg_dump -U uilbackend utilityinlife > backup.sql`; store backups outside the instance and encrypt them.
- Certificate renewal: systemd timer runs `deploy/renew-certificates.sh` daily.

The application is memory-bounded for the current small instance. Monitor memory and disk, especially PostgreSQL and Docker logs, and resize before learner traffic grows.
