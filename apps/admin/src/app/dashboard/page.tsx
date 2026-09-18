"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiUrl, authHeaders, defaultBranchId, readStaff } from "@/lib/auth";
import styles from "./page.module.css";

export default function DashboardPage() {
  const [info, setInfo] = useState("");
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState<
    Array<{ id: string; name: string }>
  >([]);

  useEffect(() => {
    const staff = readStaff();
    if (!staff) {
      setInfo("Önce giriş yapın");
      return;
    }
    setInfo(
      `${staff.name ?? staff.email} · ${staff.isSuperAdmin ? "SUPER_ADMIN" : staff.memberships.map((m) => m.role).join(", ")}`,
    );
    setBranchId(defaultBranchId(staff));
    if (staff.isSuperAdmin) {
      void fetch(`${apiUrl}/api/catalog/branches`)
        .then((r) => r.json())
        .then((d) => setBranches(d.branches ?? []));
    }
  }, []);

  return (
    <main className={styles.page}>
      <h1>Yönetim</h1>
      <p>{info}</p>
      {branches.length > 0 ? (
        <label className={styles.branch}>
          Şube
          <select
            value={branchId}
            onChange={(e) => {
              setBranchId(e.target.value);
              localStorage.setItem("silakebap.selectedBranchId", e.target.value);
            }}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <nav className={styles.nav}>
        <Link href="/kitchen">Mutfak</Link>
        <Link href="/courier">Kurye</Link>
        <Link href="/products">Ürünler</Link>
        <Link href="/zones">Bölgeler / Saat</Link>
        <Link href="/coupons">Kuponlar</Link>
        <Link href="/orders">Siparişler</Link>
        <Link href="/integrations">Entegrasyonlar</Link>
        <Link href="/login">Giriş</Link>
      </nav>
    </main>
  );
}
