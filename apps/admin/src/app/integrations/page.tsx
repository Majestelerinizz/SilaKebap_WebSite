"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { apiUrl, authHeaders } from "@/lib/auth";
import styles from "../adminForms.module.css";

type Integrations = {
  iyzico: {
    configured: boolean;
    baseUrl: string;
    callbackUrl: string;
    mode: string;
  };
  email: {
    configured: boolean;
    host: string | null;
    port: number;
    from: string;
    mode: string;
  };
  storage: {
    configured: boolean;
    bucket: string | null;
    publicBase: string | null;
  };
};

export default function IntegrationsPage() {
  const [data, setData] = useState<Integrations | null>(null);
  const [to, setTo] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch(`${apiUrl}/api/admin/integrations`, {
      headers: authHeaders(),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Yüklenemedi");
      return;
    }
    setData(json);
  }

  useEffect(() => {
    void load();
  }, []);

  async function sendTest(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`${apiUrl}/api/admin/integrations/email-test`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ to }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Test başarısız");
      return;
    }
    setMsg(`Test gönderildi (mode: ${json.mode})`);
  }

  return (
    <AdminShell title="Entegrasyonlar" subtitle="Ödeme, e-posta, depolama">
      {error ? <p className={styles.error}>{error}</p> : null}
      {msg ? <p className={styles.ok}>{msg}</p> : null}
      {!data ? (
        <p className={styles.hint}>Yükleniyor…</p>
      ) : (
        <ul className={styles.list}>
          <li className={styles.cardCol}>
            <strong>iyzico</strong>
            <span>
              {data.iyzico.configured ? "Key tanımlı" : "Key yok → stub modu"} ·{" "}
              {data.iyzico.mode}
            </span>
            <span className={styles.hint}>{data.iyzico.baseUrl}</span>
            <span className={styles.hint}>
              Callback: {data.iyzico.callbackUrl}
            </span>
            <p className={styles.hint}>
              Sandbox key’leri Doppler / `.env` içinde `IYZICO_API_KEY` /
              `IYZICO_SECRET_KEY`. Key yokken checkout stub’a yönlendirir.
            </p>
          </li>
          <li className={styles.cardCol}>
            <strong>E-posta (SMTP)</strong>
            <span>
              {data.email.configured ? "SMTP hazır" : "Console fallback"} ·{" "}
              {data.email.mode}
            </span>
            <span className={styles.hint}>
              {data.email.host ?? "SMTP_HOST boş"}:{data.email.port} ·{" "}
              {data.email.from}
            </span>
            <form className={styles.form} onSubmit={sendTest}>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="test@ornek.com"
                required
              />
              <button type="submit">Test e-posta gönder</button>
            </form>
          </li>
          <li className={styles.cardCol}>
            <strong>Cloudflare R2</strong>
            <span>
              {data.storage.configured ? "Yapılandırıldı" : "Henüz yok"}
            </span>
            <span className={styles.hint}>
              {data.storage.bucket ?? "bucket yok"} ·{" "}
              {data.storage.publicBase ?? "public URL yok"}
            </span>
          </li>
        </ul>
      )}
    </AdminShell>
  );
}
