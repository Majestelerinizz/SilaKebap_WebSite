# Sıla Kebap

Çok şubeli yemek sipariş platformu (monorepo).

## Stack

| Paket | Rol |
|---|---|
| `apps/web` | Müşteri Next.js |
| `apps/admin` | Admin + mutfak + kurye |
| `apps/api` | Express + Socket.io + iyzico |
| `packages/database` | PostgreSQL + Prisma |
| `packages/shared` | Enum, para, checkout Zod, TR etiketler |

## Canlı demo

Sunucu sürekli açık. Bu bilgisayar kapalı olsa da adresler çalışır. Gerçek alan adı bağlanınca nginx `server_name` ile `WEB_ORIGIN`, `ADMIN_ORIGIN`, `NEXT_PUBLIC_API_URL` ve `NEXT_PUBLIC_SITE_URL` değişir; kod aynı kalır.

| Servis | URL |
|---|---|
| Müşteri | https://62.171.146.132.nip.io |
| Admin giriş | https://admin.62.171.146.132.nip.io/login |
| Mutfak | https://admin.62.171.146.132.nip.io/kitchen |
| Kurye | https://admin.62.171.146.132.nip.io/courier |
| Health | https://62.171.146.132.nip.io/api/health |

Giriş kullanıcı adı `admin`, şifre `Admin1234!`. Mutfak: `mutfak` / `Kitchen123!`. Kurye: `kurye` / `Courier123!`.

Kod yolu sunucuda: `/opt/silakebap` · user: `silakebap` · secrets: `/opt/silakebap/.env`

Detay: [DEPLOY.md](./DEPLOY.md) · durum: [STATUS.md](./STATUS.md)

## Local geliştirme

```bash
pnpm install
cp .env.example .env   # veya Doppler: bak DOPPLER.md

pnpm db:push
pnpm db:seed

pnpm --filter @silakebap/shared build
pnpm --filter @silakebap/database generate
pnpm --filter @silakebap/api dev      # :4000
pnpm --filter @silakebap/web dev      # :3000
pnpm --filter @silakebap/admin dev    # :3001
```

- Web: http://localhost:3000  
- Admin: http://localhost:3001/login  
- Mutfak: http://localhost:3001/kitchen  
- Kurye: http://localhost:3001/courier  
- Health: http://localhost:4000/api/health  
- Sipariş takip: http://localhost:3000/track (**Sipariş No**, örn. `SK8A3F2B1C`)

### Seed hesapları (yalnızca local / ilk kurulum)

`.env` boşsa seed aşağıdaki varsayılanları kullanır. Şifreyi değiştirince aynı isimle kök `.env` veya Doppler `dev` içine yaz (en az 10 karakter); seed bir sonraki çalıştırmada onu alır.

```
SEED_ADMIN_PASSWORD=
SEED_KITCHEN_PASSWORD=
SEED_COURIER_PASSWORD=
```

| Rol | E-posta | Varsayılan şifre |
|---|---|---|
| Süper admin | admin@silakebap.local | Admin1234! |
| Mutfak | mutfak@silakebap.local | Kitchen123! |
| Kurye | kurye@silakebap.local | Courier123! |

Örnek kupon kodu seed’de `HOSGELDIN10`.

## Deploy (laptop → Contabo)

```bash
# bir kez: deploy/deploy.env.example → deploy/deploy.env
bash deploy/scripts/deploy.sh
```

Gereksinim: Windows/WSL veya Git Bash + `ssh` Host `contabo` + `rsync`.

## Dokümantasyon

- [STATUS.md](./STATUS.md) — tamamlanma % + kalan işler
- [DEPLOY.md](./DEPLOY.md) — Contabo / nginx / systemd / smoke
- [DOPPLER.md](./DOPPLER.md) — secrets (önerilen)
- [INTEGRATIONS.md](./INTEGRATIONS.md) — iyzico / SMTP / R2
- [AGENTS.md](./AGENTS.md) — ajan kuralları
- [SILAKEBAP.md](./SILAKEBAP.md) — ürün kapsamı
- [deploy/](./deploy/) — rsync script + nginx/systemd örnekleri
