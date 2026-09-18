# v1 maturity (~%95 hedef)

Kod tarafında müşteri + API + admin operasyon çekirdeği ~%95 seviyesine yaklaştırıldı.
Aşağıdakiler **senin ortamında** yapılmadan “canlı restoran” %95 sayılmaz:

## Senin yapman gerekenler (dış bağımlılık)

1. **Doppler** — `doppler login` + project `silakebap` (`dev` / `prd`), secret’ları doldur ([DOPPLER.md](./DOPPLER.md))
2. **VPS + Let’s Encrypt** — domain DNS + Caddy/Nginx ([DEPLOY.md](./DEPLOY.md))
3. **SMTP** — Resend veya başka SMTP (takip mailleri)
4. **iyzico sandbox key** — gerçek sandbox; live key v1’de yok
5. **Gerçek ürün fotoğrafları** — `apps/web/public/menu` yerine marka çekimleri / R2
6. **Sosyal URL’ler** — `apps/web/src/app/page.tsx` içindeki `SOCIAL`
7. **Seed yeniden** — geniş menü için `doppler run -- pnpm db:seed` (dev DB’yi sıfırlar)

## Bu turda kodda kapananlar

- Geniş menü seed (14 ürün, 5 kategori)
- TR sipariş/ödeme etiketleri (`@silakebap/shared` labels)
- E-posta şablonları (TR durum, güvenli send)
- Checkout/track/payment rate limit; auth refresh endpoint
- Çalışma saati + mahalle kontrolü checkout’ta
- Online ödemede e-posta zorunlu; kupon kullanımı ödemeden sonra
- Track timeline + adımlar; checkout Ödeme/mahalle; homepage kategoriler
- Admin: logout, refresh, mutfak kolonları, kurye tel:, rol nav
