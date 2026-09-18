# VPS Deploy (Docker yok)

## Ortamlar

| Ortam | Veritabanı |
|---|---|
| Geliştirme / test | Neon (`DATABASE_URL`) |
| Production | VPS localhost PostgreSQL |

## VPS üzerinde

1. Node 22 + pnpm kur
2. Repo’yu klonla, `pnpm install`
3. Prod `.env` oluştur:
   - `DATABASE_URL=postgresql://...@127.0.0.1:5432/silakebap`
   - `API_PUBLIC_URL=https://api.alanadin.com`
   - `WEB_ORIGIN` / `ADMIN_ORIGIN`
   - iyzico **live** key’ler (sandbox’tan ayrı)
   - SMTP
   - (opsiyonel) Redis, R2
4. `pnpm db:push` veya `prisma migrate deploy`
5. `pnpm db:seed` (yalnızca ilk kurulum)
6. Build:
   - `pnpm --filter @silakebap/shared build`
   - `pnpm --filter @silakebap/database build`
   - `pnpm --filter @silakebap/api build`
   - `pnpm --filter @silakebap/web build`
   - `pnpm --filter @silakebap/admin build`
7. Process manager (ör. systemd / pm2):
   - API: `pnpm --filter @silakebap/api start` (port 4000)
   - Web: `pnpm --filter @silakebap/web start` (3000)
   - Admin: `pnpm --filter @silakebap/admin start` (3001)
8. Reverse proxy (Caddy/Nginx) ile TLS ve domain yönlendirme

## Redis

Tek API process için zorunlu değil. Socket.io Redis olmadan çalışır.
Ölçeklenince `REDIS_URL` verin.

## Cloudflare R2

Ürün görselleri için `R2_*` env’lerini doldurun. Admin `/api/admin/storage` durumunu gösterir.

## Smoke test checklist (prod)

- [ ] `GET /api/health` 200
- [ ] Admin login (`SUPER_ADMIN`)
- [ ] Admin → Entegrasyonlar: iyzico mode + SMTP durumu
- [ ] Menü listeleniyor
- [ ] Ürün detay + sepete ekle
- [ ] Checkout quote toplam doğru
- [ ] Kapıda nakit sipariş → mutfakta görünür
- [ ] Mutfak: PREPARING → READY
- [ ] Kurye: ASSIGNED → ON_THE_WAY → DELIVERED
- [ ] Gel-Al: AWAITING_PICKUP → DELIVERED
- [ ] iyzico sandbox/live online ödeme (key varsa)
- [ ] E-posta takip linki (SMTP varsa)
- [ ] HTTPS web + admin + API

## Live key ayrımı

| Env | iyzico |
|---|---|
| Local / staging | Sandbox key + `IYZICO_BASE_URL=https://sandbox-api.iyzipay.com` |
| Production | Live key + production base URL |

Asla sandbox ve live key’leri aynı `.env`’de karıştırmayın.
