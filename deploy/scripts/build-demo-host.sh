#!/usr/bin/env bash
set -euo pipefail
cd /opt/silakebap
sudo -u silakebap -H bash -lc '
  set -euo pipefail
  cd /opt/silakebap
  set -a
  source .env
  set +a
  unset NODE_ENV
  export CI=true
  corepack prepare pnpm@9.15.0 --activate
  pnpm install --frozen-lockfile
  pnpm --filter @silakebap/shared build
  pnpm --filter @silakebap/database exec prisma generate
  pnpm --filter @silakebap/database exec prisma db push --skip-generate
  pnpm --filter @silakebap/database build
  pnpm --filter @silakebap/database exec tsx prisma/seed.ts
  pnpm --filter @silakebap/api build
  export NEXT_PUBLIC_API_URL NEXT_PUBLIC_SITE_URL API_ORIGIN
  pnpm --filter @silakebap/web build
  pnpm --filter @silakebap/admin build
'
systemctl enable --now silakebap-api silakebap-web silakebap-admin
nginx -t
systemctl reload nginx
sleep 3
curl -fsS http://127.0.0.1:14100/api/health
echo
echo BUILD_OK
