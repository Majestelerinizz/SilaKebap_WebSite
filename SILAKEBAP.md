# SILAKEBAP.md — Proje Tanım Dokümanı

## 1. Proje Özeti

Sıla Kebap için geliştirilecek, tam kapsamlı bir yemek sipariş / e-ticaret platformu.
Amaç: Yemeksepeti gibi aracı platformlarla çalışmak yerine, markanın kendi kimliğiyle
öne çıktığı, hem tanıtım hem doğrudan satış yapan bir web sitesi ve mobil-uyumlu deneyim
kurmak.

Referans alınan yapılar:
- **Yemeksepeti** → sepet/checkout akışının kullanım kolaylığı
- **Hayfene.com** → ürün kartı tasarımı, büyük ve iştah açıcı ürün görselleri,
  kategori navigasyonu

## 2. Hedefler

- Müşterinin kolayca gezip sipariş verebileceği, mobilde hızlı çalışan bir arayüz
- Marka kimliğinin (logo, renkler) ön planda olduğu, aracı platform hissi vermeyen tasarım
- Mutfak ve kurye operasyonunun admin uygulaması içinde yönetilebildiği bir sistem
- Online (iyzico) + kapıda nakit/kart + gel-al kasada/online ödeme seçenekleri

## 3. Teknoloji Stack

| Katman | Teknoloji | Not |
|---|---|---|
| Müşteri arayüzü | Next.js (`apps/web`) | SEO + SSR |
| Admin / Mutfak / Kurye | Next.js (`apps/admin`) | Rol bazlı route; müşteri sitesinden ayrı |
| Backend API | Node.js + Express (`apps/api`) | Socket.io + iyzico webhook |
| Veritabanı | PostgreSQL + Prisma | `packages/database` |
| Ortak kod | `packages/shared` | Enum, fiyat, validasyon |
| Gerçek zamanlı | Socket.io + Redis adapter | Şube odaları |
| Ödeme | iyzico + kapıda + kasada | Sandbox/live `.env` |
| Bildirim v1 | E-posta (SMTP) | SMS faz 2 |
| Görseller | Cloudflare R2 | S3 uyumlu |
| Hosting | Kendi VPS (Node süreçleri) | Prod DB: VPS PostgreSQL; test/dev: Neon |


## 4. Özellik Listesi

### 4.1 Müşteri Tarafı (Web + Mobil Uyumlu)

- Kategori bazlı ürün listeleme (Instagram hikaye tarzı kategori gezintisi)
- Büyük, iştah açıcı ürün görselleri ile ürün kartları
- Ürün detay: kademeli seçenek sunumu (boy, ekstra, çıkarılabilir, kombo)
- Sepet: localStorage + checkout’ta sunucu fiyat doğrulama
- Checkout
  - Misafir ağırlıklı: **ad + telefon zorunlu**, e-posta opsiyonel
  - Üyelik hafif/opsiyonel (v1 ince)
  - Teslimat: **Kurye** veya **Gel-Al**
  - Ödeme:
    - Kurye: iyzico online | kapıda nakit | kapıda kart
    - Gel-Al: iyzico online | kasada (`PAY_AT_STORE`)
  - Kupon / indirim kodu
- Sipariş takibi: token’lı link + durum timeline (**v1’de kurye GPS yok**)
- E-posta ile durum bildirimleri
- Açık / koyu tema

### 4.2 Admin Panel (Süper Admin)

- Şube, teslimat bölgesi (mahalle/poligon), haftalık saatler, açık/kapalı
- Ürün / kategori / seçenek yönetimi (merkezi katalog)
- `BranchProduct`: şube fiyatı, görünürlük, müsaitlik
- Sipariş, kupon, kurye atama, müşteri görünümü, raporlama

### 4.3 Mutfak Ekranı (`apps/admin`)

- Şubeye gelen siparişlerin gerçek zamanlı listesi
- Durum: PREPARING → READY (ve akışa uygun geçişler)
- Seçilen ekstra / çıkarılan malzemeler net görünür

### 4.4 Kurye Paneli (`apps/admin`)

- Atanan siparişler; COURIER_ASSIGNED → ON_THE_WAY → DELIVERED
- Gel-al siparişlerinde panel bilgilendirme / devre dışı mantığı

## 5. Roller ve Yetkiler

| Rol | Yetkiler |
|---|---|
| SUPER_ADMIN | Tüm şubeler, sistemin tamamı |
| KITCHEN | Bağlı olduğu şubenin mutfak ekranı |
| COURIER | Bağlı olduğu şubede kendine atanan siparişler |
| BRANCH_MANAGER | Faz 2 |

## 6. Sipariş Akışı

1. Müşteri sepete ekler (misafir veya üye)
2. Şube bağlamı + teslimat tipi: DELIVERY / PICKUP
3. Adres (kurye) + ad/telefon (+ opsiyonel e-posta)
4. Kupon (varsa)
5. Ödeme seçimi
   - `IYZICO_ONLINE` → `PENDING_PAYMENT` → callback → `RECEIVED`
   - Kapıda / kasada → doğrudan `RECEIVED` (ödeme unpaid/pending)
6. Mutfak: `PREPARING` → `READY`
7. DELIVERY: `COURIER_ASSIGNED` → `ON_THE_WAY` → `DELIVERED`
8. PICKUP: `AWAITING_PICKUP` → `DELIVERED`
9. Her durumda e-posta + Socket.io / takip ekranı güncellenir

### Sipariş durumu enum

`PENDING_PAYMENT` | `RECEIVED` | `PREPARING` | `READY` | `COURIER_ASSIGNED` |
`ON_THE_WAY` | `AWAITING_PICKUP` | `DELIVERED` | `CANCELLED`

## 7. Marka Kimliği

- Logo ve marka renkleri müşteri tarafından sağlanacak
- Tasarım: büyük ürün görselleri + kolay checkout; özgün marka kimliği

## 8. Yol Haritası

1. **Faz 1 — Temel Altyapı:** Monorepo, Prisma, Neon/VPS Postgres, seed, temel API
2. **Faz 2 — Müşteri Arayüzü:** Ana sayfa, katalog, detay, sepet
3. **Faz 3 — Checkout & Ödeme:** Tüm ödeme tipleri + iyzico sandbox
4. **Faz 4 — Admin:** Şube, ürün, BranchProduct, bölge, saat, kupon
5. **Faz 5 — Mutfak & Kurye + Canlı Takip:** Socket.io
6. **Faz 6 — Bildirimler & İnce Ayarlar:** E-posta şablonları, tema, sertleştirme

## 9. Çok şube / v1 notları

- Şema baştan çok şubeli (`branchId`)
- v1 operasyon: **tek şube seed** ile deneme
- Menü: ortak katalog + `BranchProduct`
- Teslimat: şube bazlı bölge + çalışma saatleri + `isOpen` toggle

## 10. Faz 2+

- SMS bildirim
- Canlı kurye konumu / harita
- BRANCH_MANAGER
- Gelişmiş çok şube menü UI
- Ağır müşteri sadakat / üyelik
