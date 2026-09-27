# Proje durumu (v1)

Son güncelleme: 2026-09-19

## Tamamlanma (kabaca)

| Alan | % | Not |
|---|---|---|
| Monorepo / API çekirdek | ~95% | Checkout, sipariş FSM, track, auth |
| Contabo prod deploy | ~90% | Canlı; local kod ↔ VPS sync eksik kalabilir |
| Müşteri web | ~85–90% | Sepet, ödeme, track kartı; gerçek foto/sosyal |
| Admin / mutfak / kurye | ~70–75% | Çalışır; CRUD/tablet cilası eksik |
| Ödeme (iyzico) | ~75% | Sandbox/stub; live key yok |
| E-posta | ~50% | Şablonlar hazır; SMTP prod’da boş olabilir |
| **Genel v1** | **~80–85%** | Site canlı kullanılabilir |

## Canlı URL’ler

- Web: https://example.com  
- Admin: https://admin.example.com/login  
- Mutfak: https://admin.example.com/kitchen  
- Kurye: https://admin.example.com/courier  
- Health: https://api.example.com/api/health  
- Takip: https://example.com/track  

SSH: `C:\Users\Yusuf\.ssh` · Host `contabo`

## Kalan işler (öncelik)

1. Local → Contabo **release** (`deploy/scripts/deploy.sh`) — track/`orderNo` vb. güncel kodu bas  
2. SMTP (Resend) — takip mailleri  
3. iyzico sandbox key (veya bilerek stub)  
4. Gerçek menü fotoğrafları / R2  
5. Sosyal Instagram/Facebook URL  
6. Admin ürün/bölge CRUD + mutfak tablet UX  
7. Doppler `prd` (opsiyonel; şu an VPS `.env`)  

## Bu sprintte kodda kapananlar (local)

- Geniş menü seed, TR labels, e-posta şablonları  
- Rate limit, auth refresh, checkout saat/mahalle  
- Sipariş No (`orderNo`) + kargo tarzı track UI  
- Theme hydration fix (`layout.tsx`)  
- Deploy klasörü Contabo’dan local’e alındı  

## Bilinçli ertelenenler (faz 2)

- Live iyzico, SMS, kurye GPS, `BRANCH_MANAGER`, çok şube UI
