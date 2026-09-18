# AGENTS.md — Sıla Kebap Projesi Ajan Rehberi

Bu dosya, bu repo üzerinde çalışacak AI ajanları için context ve kurallar içerir.
Kod yazmadan önce bu dosyayı ve `SILAKEBAP.md` dosyasını oku.

## Proje Hakkında

Sıla Kebap markası için geliştirilen, kendi marka kimliğiyle çalışan bir yemek sipariş /
e-ticaret platformu. Detaylı kapsam için `SILAKEBAP.md` dosyasına bak.

## Teknoloji Stack

- **Müşteri arayüzü:** Next.js (React), TypeScript — `apps/web`
- **Admin / Mutfak / Kurye:** Next.js, TypeScript — `apps/admin` (rol bazlı route)
- **Backend API:** Node.js + Express, TypeScript — `apps/api` + Socket.io
- **Veritabanı:** PostgreSQL + Prisma ORM — `packages/database`
- **Ortak:** tipler, enum’lar, fiyat yardımcıları — `packages/shared`
- **Monorepo:** pnpm workspaces + Turborepo
- **Ödeme:** iyzico API (sandbox/live `.env`)
- **E-posta:** pluggable SMTP (v1); SMS sonra
- **Görseller:** Cloudflare R2
- **Hosting:** kendi VPS üzerinde Node süreçleri (`web`, `admin`, `api`) + native PostgreSQL
- **DB ortamları:** geliştirme/test → Neon; production → VPS localhost PostgreSQL

## Klasör Yapısı

```
/apps
  /web          → Müşteri arayüzü (Next.js)
  /admin        → Admin + Mutfak + Kurye (Next.js, rol bazlı route)
  /api          → Express + Socket.io + iyzico webhook
/packages
  /database     → Prisma şeması, migration’lar, seed, client export
  /shared       → Ortak tipler, enum’lar, kuruş↔TL, Zod şemaları
```

## Kodlama Kuralları

- TypeScript strict mode açık tutulur, `any` kullanımından kaçınılır
- API endpoint’leri REST konvansiyonuna uyar (`/api/products`, `/api/orders` vb.)
- Veritabanı şemasında her tablo için `createdAt`/`updatedAt` alanları bulunur
- Fiyatlar veritabanında **kuruş cinsinden integer** olarak tutulur; arayüzde TL’ye çevrilir
- Ürün seçenekleri esnek variant/option modeliyle yönetilir (hardcoded olmaz)
- Çok şubeli şema: ilgili kayıtlarda `branchId`; v1 tek şube seed ile çalışır
- Menü: merkezi katalog + `BranchProduct` (şube fiyatı / görünürlük / stok durumu)
- Sepet: istemci localStorage + checkout’ta API fiyat yeniden hesaplama (kaynak doğruluk API’de)
- Rol kontrolü middleware seviyesinde yapılır

### Sipariş durumu (tek enum)

```
PENDING_PAYMENT
RECEIVED
PREPARING
READY
COURIER_ASSIGNED      // sadece DELIVERY
ON_THE_WAY            // sadece DELIVERY
AWAITING_PICKUP       // sadece PICKUP
DELIVERED
CANCELLED
```

### Ödeme tipleri

```
IYZICO_ONLINE
CASH_ON_DELIVERY
CARD_ON_DELIVERY
PAY_AT_STORE
```

`fulfillmentType`: `DELIVERY` | `PICKUP`

### Roller

- `SUPER_ADMIN` — global
- `KITCHEN` / `COURIER` — `StaffMembership` ile şubeye bağlı
- `BRANCH_MANAGER` — faz 2

## Auth

- Personel: admin paneli login (JWT access + httpOnly refresh); rol + `branchId` middleware
- Müşteri v1: misafir ağırlıklı (ad + telefon zorunlu, e-posta opsiyonel); üyelik hafif/opsiyonel
- Sipariş takibi: guessable olmayan `trackingToken` + e-posta linki (`/track/:token`)

## Ödeme (iyzico) ile Çalışırken Dikkat

- Geliştirmede **daima sandbox/test API key**; gerçek key’ler koda gömülmez
- Webhook/callback doğrulaması atlanmaz — “ödendi” sadece doğrulanmış callback sonrası
- Online: sipariş `PENDING_PAYMENT` → callback OK → `RECEIVED`
- Kapıda / kasada: sipariş doğrudan `RECEIVED`, `paymentStatus` unpaid/pending kalabilir
- Test kartı bilgileri iyzico dokümantasyonundan; gerçek kartla test yok

## Ortam Değişkenleri (.env)

```
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
IYZICO_API_KEY=
IYZICO_SECRET_KEY=
IYZICO_BASE_URL=
SMTP_HOST=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_URL=
SOCKET_IO_CORS_ORIGIN=
WEB_ORIGIN=
ADMIN_ORIGIN=
```

## Genel Ajan Kuralları

- Yeni özellik eklemeden önce `SILAKEBAP.md` kapsamıyla çelişip çelişmediğini kontrol et
- Ürün yapılandırmada tüm seçenekleri aynı anda gösterme — kademeli UX
- Mutfak ve kurye panelleri sade tutulur; admin karmaşıklığı taşınmaz
- Dark/light tema component seviyesinde baştan düşünülür
- Gerçek ödeme veya gerçek müşteri verisiyle test yapılmaz
- v1’de canlı kurye GPS yok; sadece durum timeline

## Prisma şema özeti

Ana modeller: `Branch`, `DeliveryZone`, `WorkingHours`, `User`, `StaffMembership`,
`Category`, `Product`, `OptionGroup`, `OptionItem`, `BranchProduct`, `Order`,
`OrderItem`, `OrderItemOption`, `OrderStatusHistory`, `Payment`, `Coupon`, `Address`,
`Media`. Detay: `packages/database/prisma/schema.prisma`.

## Backlog / Sonraki Adımlar

- [x] Altyapı kararları ve belge senkronu
- [x] Prisma şeması (çok şubeli)
- [x] Monorepo iskeleti
- [ ] Menü/kategori gerçek ürün verisinin çıkarılması
- [ ] iyzico sandbox hesabı / key’ler
- [ ] SMTP sağlayıcı seçimi ve şablonlar
- [ ] Domain / TLS prod ayarı
- [ ] Faz 2: SMS, kurye haritası, BRANCH_MANAGER, çok şube UI
