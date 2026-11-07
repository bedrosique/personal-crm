#!/usr/bin/env bash
set -euo pipefail
umask 077
IFS= read -r image
IFS= read -r archive
[[ "$image" =~ ^ghcr\.io/bedrosique/personal-crm@sha256:[a-f0-9]{64}$ ]] || exit 2
mkdir -p /opt/personal-crm/releases
release=$(mktemp -d /opt/personal-crm/releases/release-XXXXXXXX)
printf '%s' "$archive" | base64 --decode | tar --no-same-owner --no-same-permissions -xz -C "$release"
exec bash "$release/deploy/deploy.sh" "$image" "$release"
