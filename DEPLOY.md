# VPS Deploy (Docker yok) + Let’s Encrypt + Doppler

## Ortamlar

| Ortam | Veritabanı | Secrets | iyzico |
|---|---|---|---|
| Geliştirme / test (`dev`) | Neon | Doppler `dev` | Sandbox |
| Production (`prd`) | VPS localhost PostgreSQL | Doppler `prd` (service token) | **Sandbox** (v1) |

Live iyzico key’leri v1’de kullanılmaz; Doppler’e ekleme.

Sırlar için ayrıntı: [DOPPLER.md](./DOPPLER.md).

## Domain topolojisi (TLS)

Aynı VPS, reverse proxy + Let’s Encrypt:

| Host | Upstream |
|---|---|
| `https://www.<domain>` | web `:3000` |
| `https://admin.<domain>` | admin `:3001` |
| `https://api.<domain>` | api `:4000` |

Doppler `prd` örnekleri:

```
WEB_ORIGIN=https://www.<domain>
ADMIN_ORIGIN=https://admin.<domain>
API_PUBLIC_URL=https://api.<domain>
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com
NODE_ENV=production
```

CORS / Socket.io yalnızca bu origin’lere açık olmalıdır.

## VPS üzerinde

1. Node 22 + pnpm + Doppler CLI kur
2. Private repo’yu klonla (`gh auth` veya deploy key), `pnpm install`
3. Doppler service token ile `prd` bağla (disk `.env` oluşturma — [DOPPLER.md](./DOPPLER.md))
4. DB:
   ```bash
   doppler run -- pnpm db:push   # veya prisma migrate deploy
   doppler run -- pnpm db:seed   # yalnız ilk kurulum; ardından seed şifrelerini değiştir
   ```
5. Build:
   ```bash
   doppler run -- pnpm --filter @silakebap/shared build
   doppler run -- pnpm --filter @silakebap/database build
   doppler run -- pnpm --filter @silakebap/api build
   doppler run -- pnpm --filter @silakebap/web build
   doppler run -- pnpm --filter @silakebap/admin build
   ```
6. Process manager (systemd / pm2) — her servis `doppler run -- …`:
   - API: `pnpm --filter @silakebap/api start` (4000)
   - Web: `pnpm --filter @silakebap/web start` (3000)
   - Admin: `pnpm --filter @silakebap/admin start` (3001)

### systemd örneği (API)

`/etc/systemd/system/silakebap-api.service`:

```ini
[Unit]
Description=Sila Kebap API
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/opt/silakebap
EnvironmentFile=/etc/silakebap/doppler.env
ExecStart=/usr/bin/doppler run -- pnpm --filter @silakebap/api start
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

`doppler.env` yalnızca `DOPPLER_TOKEN` / `DOPPLER_PROJECT` / `DOPPLER_CONFIG` içerir (`chmod 600`).

## Reverse proxy + Let’s Encrypt

### Caddy (önerilen)

```caddy
www.ornek.com {
  reverse_proxy 127.0.0.1:3000
}

admin.ornek.com {
  reverse_proxy 127.0.0.1:3001
}

api.ornek.com {
  reverse_proxy 127.0.0.1:4000
}
```

Caddy otomatik TLS alır. DNS A kayıtlarını VPS IP’ye yönlendir.

### Nginx + certbot

- Üç `server` bloğu → `proxy_pass` 3000 / 3001 / 4000
- `certbot --nginx -d www.… -d admin.… -d api.…`

## Redis

Tek API process için zorunlu değil. Socket.io Redis olmadan çalışır.
Ölçeklenince `REDIS_URL` verin.

## Cloudflare R2

Ürün görselleri için `R2_*` secret’larını Doppler `prd`’ye koyun. Admin `/api/admin/storage` durumunu gösterir.

## Auth / güvenlik (v1)

- Admin login: rate limit (15 dk / 20 deneme) + şifre min 10 karakter
- Seed hesapları yalnızca ilk kurulum; paylaşılmış/prod DB’de hemen değiştir
- Repo private; secret’lar Doppler’de

## Smoke test checklist (prod)

- [ ] `GET https://api.<domain>/api/health` 200
- [ ] Admin login (`SUPER_ADMIN`) — HTTPS
- [ ] Admin → Entegrasyonlar: iyzico **sandbox** + SMTP durumu
- [ ] Menü listeleniyor
- [ ] Ürün detay + sepete ekle
- [ ] Checkout quote toplam doğru
- [ ] Kapıda nakit sipariş → mutfakta görünür
- [ ] Mutfak: PREPARING → READY
- [ ] Kurye: ASSIGNED → ON_THE_WAY → DELIVERED
- [ ] Gel-Al: AWAITING_PICKUP → DELIVERED
- [ ] iyzico **sandbox** online ödeme (key varsa)
- [ ] E-posta takip linki (SMTP varsa)
- [ ] HTTPS web + admin + API (Let’s Encrypt)

## iyzico (v1)

| Config | iyzico |
|---|---|
| `dev` / `prd` | Sandbox key + `IYZICO_BASE_URL=https://sandbox-api.iyzipay.com` |

Live key’ler ayrı bir faza kadar Doppler’de tutulmaz.
