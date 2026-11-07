#!/usr/bin/env bash
set -euo pipefail
curl --fail --silent --show-error --retry 6 --retry-all-errors --retry-delay 5 --max-time 15 http://127.0.0.1:3100/health
curl --fail --silent --show-error --retry 6 --retry-all-errors --retry-delay 5 --max-time 15 https://crm.olechkan.site/health
curl --fail --silent --show-error --max-time 30 --output /dev/null https://crm.olechkan.site/
