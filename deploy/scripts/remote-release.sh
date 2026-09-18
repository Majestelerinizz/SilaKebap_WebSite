#!/usr/bin/env bash
# Run ON the server from /opt/silakebap (as root). Builds and restarts services.
set -euo pipefail

REMOTE_PATH="${REMOTE_PATH:-/opt/silakebap}"
APP_USER="${REMOTE_USER:-silakebap}"
DO_SEED="${DO_SEED:-0}"

cd "${REMOTE_PATH}"

if [[ ! -f .env ]]; then
  echo "ERROR: ${REMOTE_PATH}/.env missing. Copy deploy/remote.env.example and fill secrets."
  exit 1
fi

# Align pnpm with packageManager field (avoid corepack 12 vs 9 clash)
if command -v corepack >/dev/null 2>&1; then
  corepack prepare pnpm@9.15.0 --activate >/dev/null 2>&1 || true
fi

# shellcheck disable=SC1091
set -a
# shellcheck source=/dev/null
source .env
set +a

if [[ -z "${NEXT_PUBLIC_API_URL:-}" ]]; then
  echo "ERROR: NEXT_PUBLIC_API_URL must be set in .env before build"
  exit 1
fi

echo "==> pnpm install"
sudo -u "${APP_USER}" -H bash -lc "
  cd '${REMOTE_PATH}'
  corepack prepare pnpm@9.15.0 --activate
  hash -r
  pnpm --version
  pnpm install --frozen-lockfile
"

echo "==> prisma generate + migrate deploy"
sudo -u "${APP_USER}" -H bash -lc "
  cd '${REMOTE_PATH}/packages/database'
  set -a
  # shellcheck disable=SC1091
  source '${REMOTE_PATH}/.env'
  set +a
  pnpm exec prisma generate
  pnpm exec prisma migrate deploy
"

if [[ "${DO_SEED}" == "1" ]]; then
  echo "==> db seed (one-time)"
  sudo -u "${APP_USER}" -H bash -lc "
    cd '${REMOTE_PATH}'
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
    pnpm db:seed
  "
fi

echo "==> build (NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL})"
sudo -u "${APP_USER}" -H bash -lc "
  cd '${REMOTE_PATH}'
  set -a && source .env && set +a
  export NEXT_PUBLIC_API_URL
  pnpm --filter @silakebap/shared build
  pnpm --filter @silakebap/database build
  pnpm --filter @silakebap/api build
  pnpm --filter @silakebap/web build
  pnpm --filter @silakebap/admin build
"

echo "==> restart systemd"
systemctl restart silakebap-api silakebap-web silakebap-admin
systemctl --no-pager --full status silakebap-api silakebap-web silakebap-admin || true

echo "==> local smoke"
curl -fsS "http://127.0.0.1:${API_PORT:-14100}/api/health" || true
echo
echo "==> remote-release done"
