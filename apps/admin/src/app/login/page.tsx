"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./login.module.css";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type StaffUser = {
  id: string;
  email: string | null;
  name: string | null;
  isSuperAdmin: boolean;
  memberships: Array<{ branchId: string; role: string }>;
};

function redirectFor(user: StaffUser): string {
  if (user.isSuperAdmin) return "/dashboard";
  const roles = user.memberships.map((m) => m.role);
  if (roles.includes("KITCHEN")) return "/kitchen";
  if (roles.includes("COURIER")) return "/courier";
  return "/dashboard";
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("mutfak@silakebap.local");
  const [password, setPassword] = useState("Kitchen123!");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch(`${apiUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Login failed");
      return;
    }
    localStorage.setItem("silakebap.accessToken", data.accessToken);
    localStorage.setItem("silakebap.staff", JSON.stringify(data.user));
    router.push(redirectFor(data.user as StaffUser));
  }

  return (
    <main className={styles.page}>
      <h1>Personel girişi</h1>
      <form onSubmit={onSubmit} className={styles.form}>
        <label>
          E-posta
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Şifre
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button type="submit">Giriş</button>
      </form>
      {error ? <p className={styles.error}>{error}</p> : null}
      <p className={styles.hint}>
        Seed: admin@silakebap.local / Admin1234! · mutfak@… / Kitchen123! ·
        kurye@… / Courier123! (min 10 karakter; prod’da değiştir)
      </p>
    </main>
  );
}
