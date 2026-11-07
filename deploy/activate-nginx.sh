#!/usr/bin/env bash
set -euo pipefail
for attempt in $(seq 1 180); do
  if curl -fsS --max-time 3 http://127.0.0.1:3100/health >/dev/null 2>&1; then break; fi
  sleep 5
done
curl -fsS --max-time 5 http://127.0.0.1:3100/health >/dev/null
python3 - <<'PY'
from pathlib import Path
import shutil, time, subprocess
p = Path('/etc/nginx/sites-available/svyazi-lesson23.conf').resolve()
old = p.read_text()
target = '''    root /var/www/svyazi-lesson23/crm;
    location / {
        try_files $uri $uri/ =404;
    }'''
replacement = '''    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }'''
if replacement in old:
    print('CRM proxy already configured')
else:
    if old.count(target) != 1:
        raise SystemExit('Unexpected Nginx configuration; no changes made')
    backup = str(p) + '.crm-backup-' + str(int(time.time()))
    shutil.copy2(p, backup)
    p.write_text(old.replace(target, replacement))
    if subprocess.run(['nginx', '-t']).returncode:
        shutil.copy2(backup, p)
        raise SystemExit('Nginx configuration restored')
    subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
PY
curl -fsS --max-time 15 https://crm.olechkan.site/health
echo 'Nginx activation complete'
