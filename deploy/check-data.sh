#!/usr/bin/env bash
set -euo pipefail
export DOCKER_HOST=unix:///run/user/1000/docker.sock
unset DOCKER_CONTEXT
cd /opt/personal-crm
export CRM_IMAGE
CRM_IMAGE=$(cat current-image)
docker compose --env-file .env -f compose.production.yaml exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -At' <<'SQL'
select 'contacts=' || count(*) from contacts;
select 'checksum=' || md5(string_agg(row_to_json(c)::text, '' order by id)) from contacts c;
select 'seed_markers=' || count(*) from crm_bootstrap where name = 'writers-v1';
select 'migrations=' || count(*) from drizzle.__drizzle_migrations;
SQL
