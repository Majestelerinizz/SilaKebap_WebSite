#!/usr/bin/env bash
# Run ON the Contabo server (as root). Installs Node 22, pnpm, app user, dirs, systemd units.
set -euo pipefail

REMOTE_PATH="${REMOTE_PATH:-/opt/silakebap}"
APP_USER="${REMOTE_USER:-silakebap}"
WEB_PORT="${WEB_PORT:-13100}"
ADMIN_PORT="${ADMIN_PORT:-13101}"
API_PORT="${API_PORT:-14100}"

echo "==> Bootstrap Sıla Kebap at ${REMOTE_PATH}"

if ! id -u "${APP_USER}" >/dev/null 2>&1; then
  useradd --system --create-home --shell /usr/sbin/nologin "${APP_USER}"
  echo "Created user ${APP_USER}"
fi

mkdir -p "${REMOTE_PATH}"
chown -R "${APP_USER}:${APP_USER}" "${REMOTE_PATH}"

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | sed 's/v//' | cut -d. -f1)" -lt 22 ]]; then
  echo "==> Installing Node.js 22 (NodeSource)"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

echo "Node: $(node -v)"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "==> Enabling pnpm via corepack"
  corepack enable
  corepack prepare pnpm@9.15.0 --activate
fi
echo "pnpm: $(pnpm -v)"

# Prefer /usr/bin/pnpm for systemd; symlink if needed
if [[ ! -x /usr/bin/pnpm ]]; then
  PNPM_BIN="$(command -v pnpm)"
  ln -sf "${PNPM_BIN}" /usr/bin/pnpm
fi

UNIT_DIR="${REMOTE_PATH}/deploy/systemd"
if [[ -d "${UNIT_DIR}" ]]; then
  echo "==> Installing systemd units (ports web=${WEB_PORT} admin=${ADMIN_PORT} api=${API_PORT})"
  # Patch ports into copies under /etc/systemd/system
  for name in silakebap-api silakebap-web silakebap-admin; do
    src="${UNIT_DIR}/${name}.service"
    dst="/etc/systemd/system/${name}.service"
    if [[ -f "${src}" ]]; then
      sed \
        -e "s|WorkingDirectory=/opt/silakebap|WorkingDirectory=${REMOTE_PATH}|g" \
        -e "s|EnvironmentFile=/opt/silakebap/.env|EnvironmentFile=${REMOTE_PATH}/.env|g" \
        -e "s|User=silakebap|User=${APP_USER}|g" \
        -e "s|Group=silakebap|Group=${APP_USER}|g" \
        -e "s|Environment=PORT=13100|Environment=PORT=${WEB_PORT}|g" \
        -e "s|Environment=PORT=13101|Environment=PORT=${ADMIN_PORT}|g" \
        -e "s|Environment=API_PORT=14100|Environment=API_PORT=${API_PORT}|g" \
        "${src}" > "${dst}"
    fi
  done
  systemctl daemon-reload
  systemctl enable silakebap-api silakebap-web silakebap-admin || true
fi

if [[ ! -f "${REMOTE_PATH}/.env" ]]; then
  if [[ -f "${REMOTE_PATH}/deploy/remote.env.example" ]]; then
    cp "${REMOTE_PATH}/deploy/remote.env.example" "${REMOTE_PATH}/.env"
    chown "${APP_USER}:${APP_USER}" "${REMOTE_PATH}/.env"
    chmod 600 "${REMOTE_PATH}/.env"
    echo "Created ${REMOTE_PATH}/.env from example — EDIT SECRETS before release"
  else
    echo "WARNING: no .env yet at ${REMOTE_PATH}/.env"
  fi
fi

echo "==> Bootstrap done"
echo "    1) Edit ${REMOTE_PATH}/.env (DATABASE_URL, JWT_*, origins)"
echo "    2) CloudPanel reverse proxy → 127.0.0.1:${WEB_PORT}/${ADMIN_PORT}/${API_PORT}"
echo "    3) Run deploy from laptop: pnpm deploy:prod"
