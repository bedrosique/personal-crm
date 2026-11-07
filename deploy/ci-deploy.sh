#!/usr/bin/env bash
set -euo pipefail
umask 077
mkdir -p ~/.ssh
printf '%s\n' "$DEPLOY_KEY" > ~/.ssh/deploy_key
printf '%s\n' "$KNOWN_HOSTS" > ~/.ssh/known_hosts
trap 'rm -f ~/.ssh/deploy_key' EXIT
archive=$(tar -cz deploy compose.production.yaml | base64 -w0)
printf '%s\n%s\n%s\n' "$IMAGE" "$archive" "$REGISTRY_TOKEN" | ssh -T -o BatchMode=yes -o StrictHostKeyChecking=yes -i ~/.ssh/deploy_key svyazi-admin@5.253.62.191 deploy
