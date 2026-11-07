#!/usr/bin/env bash
set -euo pipefail
test -S /run/user/1000/docker.sock
if [ "$(docker --context default ps -aq | wc -l)" -ne 0 ]; then
  echo 'System Docker contains containers; cleanup stopped'
  exit 1
fi
systemctl disable --now docker.service docker.socket
gpasswd -d svyazi-admin docker
install -m 755 /home/svyazi-admin/crm-deploy-setup/deploy.sh /usr/local/sbin/personal-crm-deploy
echo 'System Docker disabled; rootless Docker preserved'
