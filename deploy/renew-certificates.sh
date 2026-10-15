#!/usr/bin/env sh
set -eu

cd /opt/utility-in-life
docker compose --env-file .env.production --profile certificates run --rm --no-deps certbot \
    renew --webroot --webroot-path /var/www/certbot --quiet
docker compose --env-file .env.production exec -T nginx nginx -s reload
