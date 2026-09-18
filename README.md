# Sıla Kebap

Çok şubeli yemek sipariş platformu (monorepo).

## Stack

- `apps/web` — müşteri Next.js
- `apps/admin` — admin / mutfak / kurye Next.js
- `apps/api` — Express + Socket.io + iyzico
- `packages/database` — PostgreSQL + Prisma
- `packages/shared` — enum, para, checkout Zod

## Veritabanı

- **Geliştirme / test:** Neon (`DATABASE_URL` in `.env`)
- **Production:** VPS üzerinde native PostgreSQL (`DATABASE_URL` prod `.env`)

## Hızlı başlangıç

```bash
# 1) Bağımlılıklar
pnpm install

# 2) Env
cp .env.example .env
# DATABASE_URL = Neon connection string (dev) veya VPS Postgres (prod)

# 3) DB
pnpm db:push
pnpm db:seed

# 4) Geliştirme
pnpm --filter @silakebap/shared build
pnpm --filter @silakebap/database generate
pnpm --filter @silakebap/api dev
pnpm --filter @silakebap/web dev
pnpm --filter @silakebap/admin dev
```

- Web: http://localhost:3000  
- Admin: http://localhost:3001  
- API: http://localhost:4000/api/health  

### Seed hesapları

| Rol | E-posta | Şifre |
|---|---|---|
| Süper admin | admin@silakebap.local | Admin123! |
| Mutfak | mutfak@silakebap.local | Kitchen123! |
| Kurye | kurye@silakebap.local | Courier123! |

Kupon: `HOSGELDIN10`

## Dokümantasyon

- [DEPLOY.md](./DEPLOY.md) — VPS deploy + smoke checklist
- [INTEGRATIONS.md](./INTEGRATIONS.md) — iyzico / SMTP
- [AGENTS.md](./AGENTS.md) — ajan / kod kuralları
- [SILAKEBAP.md](./SILAKEBAP.md) — ürün kapsamı
