"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiUrl, authHeaders, defaultBranchId, readStaff } from "@/lib/auth";
import styles from "../adminForms.module.css";

type Coupon = {
  id: string;
  code: string;
  type: string;
  value: number;
  isActive: boolean;
  minOrderCents: number;
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [code, setCode] = useState("");
  const [value, setValue] = useState("10");
  const [type, setType] = useState("PERCENT");
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch(`${apiUrl}/api/admin/coupons`, {
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Yüklenemedi");
      return;
    }
    setCoupons(data.coupons ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const branchId =
      localStorage.getItem("silakebap.selectedBranchId") ||
      defaultBranchId(readStaff());
    const res = await fetch(`${apiUrl}/api/admin/coupons`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        code,
        type,
        value: Number(value),
        branchId: branchId || null,
        minOrderCents: 0,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Eklenemedi");
      return;
    }
    setCode("");
    void load();
  }

  async function toggle(c: Coupon) {
    await fetch(`${apiUrl}/api/admin/coupons/${c.id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ isActive: !c.isActive }),
    });
    void load();
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>Kuponlar</h1>
        <Link href="/dashboard">Yönetim</Link>
      </header>
      {error ? <p className={styles.error}>{error}</p> : null}
      <form className={styles.form} onSubmit={create}>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Kod"
          required
        />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="PERCENT">Yüzde</option>
          <option value="FIXED">Sabit (kuruş)</option>
        </select>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Değer"
          required
        />
        <button type="submit">Ekle</button>
      </form>
      <ul className={styles.list}>
        {coupons.map((c) => (
          <li key={c.id} className={styles.card}>
            <div>
              <strong>{c.code}</strong>
              <span>
                {c.type} {c.value}
              </span>
            </div>
            <button type="button" onClick={() => toggle(c)}>
              {c.isActive ? "Pasifleştir" : "Aktifleştir"}
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
