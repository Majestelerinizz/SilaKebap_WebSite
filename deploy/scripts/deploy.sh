#!/usr/bin/env bash
# Run from the laptop repo root. Uses SSH Host "contabo" (see ~/.ssh/config).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "${ROOT}"

DEPLOY_ENV_FILE="${ROOT}/deploy/deploy.env"
if [[ -f "${DEPLOY_ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  set -a && source "${DEPLOY_ENV_FILE}" && set +a
fi

SSH_HOST="${SSH_HOST:-contabo}"
REMOTE_PATH="${REMOTE_PATH:-/opt/silakebap}"
REMOTE_USER="${REMOTE_USER:-silakebap}"
WEB_PORT="${WEB_PORT:-13100}"
ADMIN_PORT="${ADMIN_PORT:-13101}"
API_PORT="${API_PORT:-14100}"

DO_SEED=0
DO_BOOTSTRAP=0
for arg in "$@"; do
  case "${arg}" in
    --seed) DO_SEED=1 ;;
    --bootstrap) DO_BOOTSTRAP=1 ;;
    -h|--help)
      echo "Usage: $0 [--bootstrap] [--seed]"
      echo "  --bootstrap  install Node/pnpm/user/systemd on server (first time)"
      echo "  --seed       run prisma seed once after migrate"
      exit 0
      ;;
  esac
done

echo "==> SSH check (${SSH_HOST})"
ssh -o BatchMode=yes -o ConnectTimeout=15 "${SSH_HOST}" 'hostname && whoami'

RSYNC_EXCLUDES=(
  --exclude '.git'
  --exclude 'node_modules'
  --exclude '.next'
  --exclude 'dist'
  --exclude '.turbo'
  --exclude '.env'
  --exclude '.env.local'
  --exclude 'deploy/deploy.env'
  --exclude '*.log'
  --exclude 'coverage'
  --exclude 'apps/web/tsconfig.tsbuildinfo'
  --exclude 'apps/admin/tsconfig.tsbuildinfo'
)

echo "==> rsync → ${SSH_HOST}:${REMOTE_PATH}"
ssh "${SSH_HOST}" "mkdir -p '${REMOTE_PATH}'"
rsync -az --delete \
  "${RSYNC_EXCLUDES[@]}" \
  "${ROOT}/" \
  "${SSH_HOST}:${REMOTE_PATH}/"

ssh "${SSH_HOST}" "chown -R '${REMOTE_USER}:${REMOTE_USER}' '${REMOTE_PATH}' && chmod 600 '${REMOTE_PATH}/.env' 2>/dev/null || true"

if [[ "${DO_BOOTSTRAP}" == "1" ]]; then
  echo "==> bootstrap-remote"
  ssh "${SSH_HOST}" \
    "REMOTE_PATH='${REMOTE_PATH}' REMOTE_USER='${REMOTE_USER}' WEB_PORT='${WEB_PORT}' ADMIN_PORT='${ADMIN_PORT}' API_PORT='${API_PORT}' bash '${REMOTE_PATH}/deploy/scripts/bootstrap-remote.sh'"
fi

# Ensure scripts are executable
ssh "${SSH_HOST}" "chmod +x '${REMOTE_PATH}/deploy/scripts/'*.sh"

echo "==> remote-release"
ssh "${SSH_HOST}" \
  "REMOTE_PATH='${REMOTE_PATH}' REMOTE_USER='${REMOTE_USER}' DO_SEED='${DO_SEED}' bash '${REMOTE_PATH}/deploy/scripts/remote-release.sh'"

echo "==> public smoke"
if curl -fsS "http://62.171.146.132.nip.io/api/health" >/tmp/silakebap-health.json 2>/dev/null; then
  cat /tmp/silakebap-health.json
  echo
else
  echo "WARN: public health check failed (CloudPanel SSL/proxy or DNS may still be pending)."
  echo "      Local on server: ssh ${SSH_HOST} \"curl -fsS http://127.0.0.1:${API_PORT}/api/health\""
fi

echo "==> deploy finished"
echo "    Web:   http://62.171.146.132.nip.io  (→ :${WEB_PORT})"
echo "    Admin: http://admin.62.171.146.132.nip.io  (→ :${ADMIN_PORT})"
echo "    API:   http://62.171.146.132.nip.io/api  (→ :${API_PORT})"
