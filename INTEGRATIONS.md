# Entegrasyonlar (Resend + iyzico + Cloudflare R2)

Canlı demo: `http://62.171.146.132.nip.io` ve `http://admin.62.171.146.132.nip.io`. Gerçek alan adı sonra bu adreslerin yerine geçer.
Sırlar: VPS `/opt/silakebap/.env` veya [DOPPLER.md](./DOPPLER.md). Şablon: [deploy/remote.env.example](./deploy/remote.env.example).

Disk `.env` yalnızca geçici lokal fallback; commit etme.

## Resend (e-posta)

Kod nodemailer SMTP kullanır; Resend SMTP ile uyumludur.

1. [resend.com](https://resend.com) hesap + API key (`re_...`).
2. Domain ekle ve DNS (SPF/DKIM) doğrula. Domain yokken test için `onboarding@resend.dev` kullanılabilir (çoğunlukla yalnızca kendi hesabına gönderim).
3. Doppler (veya geçici `.env`):

```
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=re_xxxxxxxx
SMTP_FROM="Sıla Kebap <noreply@senindomain.com>"
```

4. API’yi yeniden başlat.
5. Admin → Entegrasyonlar → test e-posta.

`SMTP_HOST` boşsa mailler API konsoluna yazılır.

## iyzico sandbox (v1 — local ve VPS)

v1’de **her ortam sandbox**. Live key ekleme.

```
IYZICO_API_KEY=sandbox-...
IYZICO_SECRET_KEY=sandbox-...
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com
API_PUBLIC_URL=http://localhost:4000
```

Prod’da `API_PUBLIC_URL=https://api.<domain>` (Let’s Encrypt).

Key yoksa sistem `sandbox-stub` modunda kalır. Key varken checkout “iyzico online” gerçek sandbox sayfasını açar; callback `POST /api/payments/iyzico/callback`.

## Cloudflare R2 (ürün görselleri)

1. Cloudflare Dashboard → **R2** → Create bucket (`silakebap`).
2. Bucket Settings → **Public access**: R2.dev subdomain **veya** custom domain.
3. **Manage R2 API Tokens** → Object Read & Write, bu bucket’a kısıtlı token.
4. Doppler:

```
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=silakebap
R2_PUBLIC_URL=https://pub-xxxx.r2.dev
```

5. API restart → Admin → Entegrasyonlar: storage `configured: true`.
6. Admin → Ürünler → ürünü aç → görsel seç; dosya R2’ye yüklenir, menüde görünür.

CORS: tarayıcıdan doğrudan R2 PUT için bucket CORS’a admin origin ekle (`http://localhost:3001` veya `https://admin.<domain>`).
