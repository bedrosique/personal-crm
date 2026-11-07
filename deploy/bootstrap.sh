#!/usr/bin/env bash
set -euo pipefail
cd /home/svyazi-admin/crm-deploy-setup
if ! command -v docker >/dev/null; then
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io docker-compose-v2
fi
docker compose version
systemctl enable --now docker
usermod -aG docker svyazi-admin
install -d -m 700 -o svyazi-admin -g svyazi-admin /opt/personal-crm
install -m 644 -o svyazi-admin -g svyazi-admin compose.production.yaml /opt/personal-crm/
install -m 755 deploy.sh /usr/local/sbin/personal-crm-deploy
install -m 755 ssh-entry.sh /usr/local/sbin/personal-crm-ssh
python3 - <<'PY'
import pathlib, secrets, os
p = pathlib.Path('/opt/personal-crm/.env')
if not p.exists():
    password = secrets.token_hex(32)
    fd = os.open(p, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w') as f:
        f.write(f'POSTGRES_DB=personal_crm\nPOSTGRES_USER=personal_crm\nPOSTGRES_PASSWORD={password}\nDATABASE_URL=postgresql://personal_crm:{password}@postgres:5432/personal_crm\n')
    import pwd
    u = pwd.getpwnam('svyazi-admin')
    os.chown(p, u.pw_uid, u.pw_gid)
PY
touch /home/svyazi-admin/crm-deploy-setup/bootstrap-complete
echo 'Bootstrap complete. You may close this window.'
