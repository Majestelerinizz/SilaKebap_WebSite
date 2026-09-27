# Doppler (secrets)

Sırlar IDE’ye / git’e yapıştırılmaz. Local ve VPS aynı Doppler projesinden okur.

## Kurulum (bir kez)

1. [doppler.com](https://www.doppler.com) hesap + CLI: `winget install Doppler.doppler` veya https://docs.doppler.com/docs/install-cli
2. `doppler login`
3. Repo kökünde:

```bash
doppler setup
# Project: silakebap
# Config:  dev   (local)
```

4. Secrets’ı Doppler UI veya CLI ile doldur (şablon: [.env.example](./.env.example)):

| Config | Kullanım |
|---|---|
| `dev` | Local: Neon `DATABASE_URL`, sandbox iyzico, `localhost` origin’ler |
| `prd` | VPS: localhost Postgres, **aynı sandbox** iyzico, HTTPS origin’ler |

**Live iyzico key’leri bu aşamada Doppler’e ekleme.**

Örnek `prd` / Contabo origin’ler (canlı domain):

```
WEB_ORIGIN=http://62.171.146.132.nip.io
ADMIN_ORIGIN=http://admin.62.171.146.132.nip.io
API_PUBLIC_URL=http://62.171.146.132.nip.io
NEXT_PUBLIC_API_URL=http://62.171.146.132.nip.io
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com
NODE_ENV=production
API_PORT=14100
```

Not: Production şu an çoğunlukla VPS üzerindeki `/opt/silakebap/.env` ile çalışır.
Doppler `prd` opsiyonel; bağlarsan systemd’yi `doppler run` ile güncelle ([DEPLOY.md](./DEPLOY.md)).

## Local geliştirme

Root `.env` dosyası **zorunlu değil**. Doppler inject eder:

```bash
pnpm doppler:dev          # turbo / tüm paketler — veya:
doppler run --config dev -- pnpm --filter @silakebap/api dev
doppler run --config dev -- pnpm --filter @silakebap/web dev
doppler run --config dev -- pnpm --filter @silakebap/admin dev
```

DB komutları:

```bash
doppler run --config dev -- pnpm db:push
doppler run --config dev -- pnpm db:seed
```

Geçici olarak disk `.env` kullanıyorsan git’e ekleme; `.gitignore` / `.cursorignore` korur.

## VPS (service token)

1. Doppler → Project `silakebap` → `prd` → **Access** → **Service Tokens** → Create  
   - Token’ı yalnızca sunucuda tut; chat/commit’e yapıştırma.
2. Sunucuda:

```bash
# örn. /etc/silakebap/doppler.env (chmod 600, root-only)
DOPPLER_TOKEN=dp.st.prd....
DOPPLER_PROJECT=silakebap
DOPPLER_CONFIG=prd
```

3. Process’leri `doppler run` ile başlat (systemd örneği [DEPLOY.md](./DEPLOY.md) içinde).

```bash
doppler run -- pnpm --filter @silakebap/api start
doppler run -- pnpm --filter @silakebap/web start
doppler run -- pnpm --filter @silakebap/admin start
```

Service token ortam değişkenlerinden okunur; CLI login gerekmez.

## IDE güvenliği

- Cursor / VS Code’a gerçek API key yapıştırma
- Chat’e secret paste etme
- Repo **private**; yine de secret’lar sadece Doppler’de
