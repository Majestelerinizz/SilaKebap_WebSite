#!/usr/bin/env bash
set -euo pipefail
python3 /tmp/switch-demo-https.py
install -d /etc/letsencrypt/renewal-hooks/deploy
printf '%s\n' '#!/bin/sh' 'systemctl reload nginx' > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
chmod 755 /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
cd /opt/silakebap
sudo -u silakebap -H bash -lc '
  set -euo pipefail
  cd /opt/silakebap
  set -a
  source .env
  set +a
  unset NODE_ENV
  export CI=true
  export NEXT_PUBLIC_API_URL NEXT_PUBLIC_SITE_URL API_ORIGIN
  corepack prepare pnpm@9.15.0 --activate
  pnpm --filter @silakebap/web build
  pnpm --filter @silakebap/admin build
'
systemctl restart silakebap-api silakebap-web silakebap-admin
echo REBUILD_OK
