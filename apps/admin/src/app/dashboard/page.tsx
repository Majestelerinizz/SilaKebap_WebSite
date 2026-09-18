"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import {
  apiUrl,
  authHeaders,
  defaultBranchId,
  readStaff,
  type StaffUser,
} from "@/lib/auth";
import styles from "./page.module.css";

export default function DashboardPage() {
  const [staff, setStaff] = useState<StaffUser | null>(null);
  const [stats, setStats] = useState({
    openOrders: 0,
    products: 0,
    coupons: 0,
  });

  useEffect(() => {
    const s = readStaff();
    setStaff(s);
    const branchId =
      localStorage.getItem("silakebap.selectedBranchId") ||
      defaultBranchId(s);

    async function load() {
      try {
        const [oRes, pRes, cRes] = await Promise.all([
          branchId
            ? fetch(`${apiUrl}/api/orders/branch/${branchId}`, {
                headers: authHeaders(),
              })
            : Promise.resolve(null),
          s?.isSuperAdmin
            ? fetch(`${apiUrl}/api/admin/products`, { headers: authHeaders() })
            : Promise.resolve(null),
          s?.isSuperAdmin
            ? fetch(`${apiUrl}/api/admin/coupons`, { headers: authHeaders() })
            : Promise.resolve(null),
        ]);
        const next = { openOrders: 0, products: 0, coupons: 0 };
        if (oRes?.ok) {
          const d = await oRes.json();
          next.openOrders = (d.orders as unknown[] | undefined)?.length ?? 0;
        }
        if (pRes?.ok) {
          const d = await pRes.json();
          next.products = (d.products as unknown[] | undefined)?.length ?? 0;
        }
        if (cRes?.ok) {
          const d = await cRes.json();
          next.coupons = (d.coupons as unknown[] | undefined)?.length ?? 0;
        }
        setStats(next);
      } catch {
        /* ignore summary errors */
      }
    }
    void load();
  }, []);

  const role = staff
    ? staff.isSuperAdmin
      ? "Süper admin"
      : staff.memberships.map((m) => m.role).join(", ")
    : "…";

  return (
    <AdminShell
      title="Özet"
      subtitle={`${staff?.name ?? staff?.email ?? ""} · ${role}`}
    >
      <div className={styles.grid}>
        <article className={styles.stat}>
          <span>Açık sipariş</span>
          <strong>{stats.openOrders}</strong>
        </article>
        {staff?.isSuperAdmin ? (
          <>
            <article className={styles.stat}>
              <span>Ürün</span>
              <strong>{stats.products}</strong>
            </article>
            <article className={styles.stat}>
              <span>Kupon</span>
              <strong>{stats.coupons}</strong>
            </article>
          </>
        ) : null}
      </div>
      <p className={styles.hint}>
        Sol menüden (mobilde alt bardan) sipariş, ürün ve operasyon ekranlarına
        geç. Mutfak ve kurye dokunmatik / telefon için ayrı optimize edildi.
      </p>
    </AdminShell>
  );
}
