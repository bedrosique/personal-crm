#!/usr/bin/env bash
set -euo pipefail
IFS= read -r image
exec /usr/local/sbin/personal-crm-deploy "$image"
