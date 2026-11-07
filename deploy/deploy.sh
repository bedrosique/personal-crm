#!/usr/bin/env bash
set -euo pipefail
umask 077
export PATH="/home/svyazi-admin/.local/bin:$PATH"
unset DOCKER_CONTEXT
export DOCKER_HOST=unix:///run/user/1000/docker.sock
image=${1:?Image required}
source_dir=${2:?Release directory required}
[[ "$image" =~ ^ghcr\.io/bedrosique/personal-crm@sha256:[a-f0-9]{64}$ ]] || exit 2
cd /opt/personal-crm
exec 9>deploy.lock
flock -w 600 9
export DOCKER_CONFIG
DOCKER_CONFIG=$(mktemp -d)
trap 'rm -rf "$DOCKER_CONFIG"' EXIT
docker login ghcr.io -u bedrosique --password-stdin >/dev/null 2>&1
export CRM_IMAGE="$image"
install -m 600 "$source_dir/compose.production.yaml" compose.production.yaml
compose() { docker compose -p prod --env-file .env -f compose.production.yaml "$@"; }
compose config --quiet
compose pull --quiet app
mkdir -p backups
legacy_db=$(docker ps -q --filter label=com.docker.compose.project=personal-crm-production --filter label=com.docker.compose.service=postgres)
if [[ -n "$legacy_db" ]]; then
  docker exec "$legacy_db" sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "backups/pre-transition-$(date -u +%Y%m%dT%H%M%SZ).dump"
  mapfile -t legacy < <(docker ps -q --filter label=com.docker.compose.project=personal-crm-production)
  docker stop "${legacy[@]}" >/dev/null
fi
compose up -d --wait postgres
compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "backups/pre-deploy-$(date -u +%Y%m%dT%H%M%SZ).dump"
compose run --rm --no-deps app node node_modules/tsx/dist/cli.mjs scripts/migrate.ts
compose run --rm --no-deps app node node_modules/tsx/dist/cli.mjs scripts/seed-once.ts
# Fail without rollback: recovery is an explicit operator action.
compose up -d --wait --wait-timeout 180 app
bash "$source_dir/deploy/smoke.sh"
previous=$(cat current-image 2>/dev/null || true)
printf '%s\n' "$previous" > previous-image
printf '%s\n' "$image" > current-image
bash "$source_dir/deploy/cleanup-images.sh" "$image" "$previous"
echo 'Deployment healthy'
