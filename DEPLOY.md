# Deploy — Contabo VPS (canlı)

## Mevcut production (2026-09)

| Öğe | Değer |
|---|---|
| SSH | `Host contabo` → `62.171.146.132` (user `root`, key `~/.ssh/id_ed25519`) |
| App path | `/opt/silakebap` |
| App user | `silakebap` |
| Secrets | `/opt/silakebap/.env` (chmod 600; commit etme) |
| Panel | CloudPanel + **nginx** (TLS sertifikaları panelde) |
| DB | VPS PostgreSQL (`DATABASE_URL` → localhost) |
| Redis | Sunucuda var; API Redis olmadan da ayağa kalkar |

### Domain / port map

| Public host | systemd | Listen |
|---|---|---|
| https://example.com | `silakebap-web` | `13100` |
| https://www.example.com | `silakebap-web` | `13100` |
| https://admin.example.com | `silakebap-admin` | `13101` |
| https://api.example.com | `silakebap-api` | `14100` |

Health: `GET https://api.example.com/api/health` → `{"ok":true,...,"db":"up"}`

### Admin paneli yolları

| Sayfa | URL |
|---|---|
| Login | `/login` |
| Dashboard | `/dashboard` |
| Mutfak | `/kitchen` |
| Kurye | `/courier` |
| Ürünler / bölgeler / kupon / siparişler / entegrasyonlar | dashboard linkleri |

## Ortamlar

| Ortam | DB | Secrets | iyzico (v1) |
|---|---|---|---|
| Local | Neon | Doppler `dev` veya `.env` | Sandbox |
| Production | VPS Postgres | `/opt/silakebap/.env` (Doppler `prd` opsiyonel) | Sandbox / key yoksa stub |

Live iyzico key’leri v1’de zorunlu değil.

Şablon: [deploy/remote.env.example](./deploy/remote.env.example) · [DOPPLER.md](./DOPPLER.md)

## Laptop’tan release

Repo kökünden (Git Bash / WSL):

```bash
cp deploy/deploy.env.example deploy/deploy.env   # gerekirse düzenle
bash deploy/scripts/deploy.sh
# ilk kurulum: bash deploy/scripts/deploy.sh --bootstrap
# seed (DİKKAT: DB temizler): bash deploy/scripts/deploy.sh --seed
```

Script: rsync → remote `pnpm install` + build + `systemctl restart silakebap-*`.  
`.env` rsync ile **silinmez** (`--exclude .env`).

Windows notu: `rsync` yoksa WSL kullan veya Contabo’ya Git clone + sunucu içi pull akışına geç.

## systemd (özet)

Dosyalar: [deploy/systemd/](./deploy/systemd/)

```bash
ssh contabo 'systemctl status silakebap-web silakebap-admin silakebap-api --no-pager'
ssh contabo 'journalctl -u silakebap-api -n 50 --no-pager'
```

## Nginx örnekleri

CloudPanel site conf’larına eklenecek `location` parçaları: [deploy/nginx/](./deploy/nginx/)

## Auth / güvenlik

- Login rate limit + şifre min 10
- Repo: GitHub private `Majestelerinizz/SilaKebap_WebSite`
- Sipariş takip: **Sipariş No** (`SK…`) — `/track`

## Smoke checklist (prod)

- [x] Health 200 + `db:up`
- [ ] Admin login HTTPS
- [ ] Mutfak gerçek zamanlı sipariş
- [ ] Checkout → mutfak → kurye / gel-al
- [ ] `/track` Sipariş No
- [ ] SMTP takip maili (SMTP doluysa)
- [ ] iyzico sandbox (key varsa)

## Local portlar (karıştırmayın)

| App | Local | Prod VPS |
|---|---|---|
| web | 3000 | 13100 |
| admin | 3001 | 13101 |
| api | 4000 | 14100 |
