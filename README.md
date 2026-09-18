# Sıla Kebap

Çok şubeli yemek sipariş platformu (monorepo).

## Stack

- `apps/web` — müşteri Next.js
- `apps/admin` — admin / mutfak / kurye Next.js
- `apps/api` — Express + Socket.io + iyzico
- `packages/database` — PostgreSQL + Prisma
- `packages/shared` — enum, para, checkout Zod

## Veritabanı

- **Geliştirme / test:** Neon (`DATABASE_URL` — Doppler `dev`)
- **Production:** VPS native PostgreSQL (Doppler `prd`)

## Secrets (Doppler)

IDE’ye / git’e key yapıştırma. Kurulum: [DOPPLER.md](./DOPPLER.md).

```bash
pnpm install
doppler setup   # project silakebap, config dev
doppler run --config dev -- pnpm db:push
doppler run --config dev -- pnpm db:seed
pnpm doppler:dev   # veya ayrı terminallerde doppler run -- …
```

Geçici disk `.env` hâlâ desteklenir (`cp .env.example .env`) ama commit etme.

## Hızlı başlangıç (özet)

```bash
pnpm install
# Doppler tercih edilir; yoksa:
cp .env.example .env

pnpm db:push
pnpm db:seed

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
| Süper admin | admin@silakebap.local | Admin1234! |
| Mutfak | mutfak@silakebap.local | Kitchen123! |
| Kurye | kurye@silakebap.local | Courier123! |

Şifre politikası: **min 10 karakter**. Paylaşılan/prod DB’de seed şifrelerini hemen değiştir.

Kupon: `HOSGELDIN10`

## Dokümantasyon

- [STATUS.md](./STATUS.md) — v1 ~%95 durumu + senin yapacakların
- [DOPPLER.md](./DOPPLER.md) — secrets (local + VPS)
- [DEPLOY.md](./DEPLOY.md) — VPS + Let’s Encrypt + smoke checklist
- [INTEGRATIONS.md](./INTEGRATIONS.md) — iyzico / SMTP / R2
- [AGENTS.md](./AGENTS.md) — ajan / kod kuralları
- [SILAKEBAP.md](./SILAKEBAP.md) — ürün kapsamı
