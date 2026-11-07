#!/usr/bin/env bash
set -euo pipefail
umask 077
image=${1:?Image required}
[[ "$image" =~ ^ghcr\.io/bedrosique/personal-crm@sha256:[a-f0-9]{64}$ ]] || exit 2
cd /opt/personal-crm
exec 9>/opt/personal-crm/deploy.lock
flock -w 600 9
export DOCKER_CONFIG
DOCKER_CONFIG=$(mktemp -d)
trap 'rm -rf "$DOCKER_CONFIG"' EXIT
docker login ghcr.io -u bedrosique --password-stdin >/dev/null 2>&1
export CRM_IMAGE="$image"
compose() { docker compose --env-file .env -f compose.production.yaml "$@"; }
compose pull app
compose up -d --wait postgres
if compose ps --status running --services | grep -qx app; then
  mkdir -p backups
  compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "backups/pre-deploy-$(date -u +%Y%m%dT%H%M%SZ).dump"
fi
compose run --rm --no-deps app node node_modules/tsx/dist/cli.mjs scripts/migrate.ts
compose run --rm --no-deps app node node_modules/tsx/dist/cli.mjs scripts/seed-once.ts
previous=$(cat current-image 2>/dev/null || true)
if ! compose up -d --wait --wait-timeout 180 app; then
  if [[ -n "$previous" ]]; then
    export CRM_IMAGE="$previous"
    compose up -d --wait --wait-timeout 180 app
  fi
  exit 1
fi
curl --fail --silent --max-time 15 http://127.0.0.1:3100/health
printf '%s\n' "$image" > current-image
echo 'Deployment healthy'
