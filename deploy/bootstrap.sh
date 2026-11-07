#!/usr/bin/env bash
set -euo pipefail
cd /home/svyazi-admin/crm-deploy-setup
# Reuse existing rootless Docker and secrets; never create or modify .env.
test -S /run/user/1000/docker.sock
test -f /opt/personal-crm/.env
test "$(stat -c %a /opt/personal-crm/.env)" = 600
install -m 755 ssh-entry.sh /usr/local/sbin/personal-crm-ssh
bash activate-nginx.sh
echo 'Deployment entry and Nginx configured'
