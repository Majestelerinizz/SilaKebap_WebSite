#!/usr/bin/env bash
# First-time demo host on the VPS. Does not touch other nginx sites.
set -euo pipefail

id silakebap >/dev/null 2>&1 || useradd --system --home-dir /opt/silakebap --create-home --shell /usr/sbin/nologin silakebap
mkdir -p /opt/silakebap
tar -xzf /tmp/silakebap-src.tgz -C /opt/silakebap
chown -R silakebap:silakebap /opt/silakebap

DBPASS="$(openssl rand -hex 18)"
JWT1="$(openssl rand -hex 32)"
JWT2="$(openssl rand -hex 32)"

sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'silakebap') THEN
    CREATE ROLE silakebap LOGIN PASSWORD '${DBPASS}';
  ELSE
    ALTER ROLE silakebap WITH LOGIN PASSWORD '${DBPASS}';
  END IF;
END
\$\$;
SQL

if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname = 'silakebap'" | grep -q 1; then
  sudo -u postgres createdb -O silakebap silakebap
fi

umask 077
cat > /opt/silakebap/.env <<ENV
DATABASE_URL=postgresql://silakebap:${DBPASS}@127.0.0.1:5432/silakebap
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=${JWT1}
JWT_REFRESH_SECRET=${JWT2}
IYZICO_API_KEY=
IYZICO_SECRET_KEY=
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com
API_PUBLIC_URL=http://62.171.146.132.nip.io
NEXT_PUBLIC_API_URL=http://62.171.146.132.nip.io
NEXT_PUBLIC_SITE_URL=http://62.171.146.132.nip.io
API_ORIGIN=http://127.0.0.1:14100
WEB_ORIGIN=http://62.171.146.132.nip.io
ADMIN_ORIGIN=http://admin.62.171.146.132.nip.io
API_PORT=14100
NODE_ENV=production
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="Sila Kebap <noreply@example.com>"
ENV
chown silakebap:silakebap /opt/silakebap/.env
chmod 600 /opt/silakebap/.env

cp /opt/silakebap/deploy/systemd/silakebap-api.service /etc/systemd/system/silakebap-api.service
cp /opt/silakebap/deploy/systemd/silakebap-web.service /etc/systemd/system/silakebap-web.service
cp /opt/silakebap/deploy/systemd/silakebap-admin.service /etc/systemd/system/silakebap-admin.service
cp /opt/silakebap/deploy/nginx/demo-host.conf /etc/nginx/sites-enabled/silakebap-demo.conf
nginx -t
systemctl daemon-reload
echo SETUP_OK
