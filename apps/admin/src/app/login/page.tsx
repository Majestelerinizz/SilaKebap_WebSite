"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { apiUrl, saveSession, type StaffUser } from "@/lib/auth";
import styles from "./login.module.css";

function redirectFor(user: StaffUser): string {
  if (user.isSuperAdmin) return "/dashboard";
  const roles = user.memberships.map((m) => m.role);
  if (roles.includes("KITCHEN")) return "/kitchen";
  if (roles.includes("COURIER")) return "/courier";
  return "/dashboard";
}

const showSeedHint = process.env.NODE_ENV === "development";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Giriş başarısız");
        return;
      }
      saveSession(
        data.accessToken as string,
        data.refreshToken as string,
        data.user as StaffUser,
      );
      router.push(redirectFor(data.user as StaffUser));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.glow} aria-hidden />
      <div className={styles.card}>
        <BrandMark size="lg" />
        <h1 className={styles.title}>Personel girişi</h1>
        <p className={styles.lead}>Mutfak, kurye ve yönetim paneli</p>
        <form onSubmit={onSubmit} className={styles.form}>
          <label>
            E-posta
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Şifre
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={10}
            />
          </label>
          <button type="submit" disabled={busy}>
            {busy ? "Giriş…" : "Giriş"}
          </button>
        </form>
        {error ? <p className={styles.error}>{error}</p> : null}
        {showSeedHint ? (
          <p className={styles.hint}>
            Seed: admin@silakebap.local / Admin1234! · mutfak@… / Kitchen123! ·
            kurye@… / Courier123!
          </p>
        ) : null}
      </div>
    </main>
  );
}
