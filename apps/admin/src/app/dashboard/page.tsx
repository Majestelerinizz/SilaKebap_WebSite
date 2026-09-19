"use client";

import { useCallback, useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { AdminShell } from "@/components/AdminShell";
import {
  apiFetch,
  apiUrl,
  readStaff,
  resolveActiveBranchId,
  type StaffUser,
} from "@/lib/auth";
import styles from "./page.module.css";

export default function DashboardPage() {
  const [staff, setStaff] = useState<StaffUser | null>(null);
  const [branchId, setBranchId] = useState("");
  const [live, setLive] = useState(false);
  const [stats, setStats] = useState({
    openOrders: 0,
    products: 0,
    coupons: 0,
  });

  const load = useCallback(async (s: StaffUser | null, bid: string) => {
    try {
      const [oRes, pRes, cRes] = await Promise.all([
        bid
          ? apiFetch(`${apiUrl}/api/orders/branch/${bid}`)
          : Promise.resolve(null),
        s?.isSuperAdmin
          ? apiFetch(`${apiUrl}/api/admin/products`)
          : Promise.resolve(null),
        s?.isSuperAdmin
          ? apiFetch(`${apiUrl}/api/admin/coupons`)
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
  }, []);

  useEffect(() => {
    const s = readStaff();
    setStaff(s);
    let cancelled = false;
    void (async () => {
      const bid = await resolveActiveBranchId();
      if (cancelled) return;
      setBranchId(bid);
      await load(s, bid);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    if (!branchId) return;
    const socket: Socket = io(apiUrl, { transports: ["websocket", "polling"] });
    socket.emit("join:admin", branchId);
    socket.on("connect", () => setLive(true));
    socket.on("disconnect", () => setLive(false));
    const refresh = () => void load(readStaff(), branchId);
    socket.on("order:created", refresh);
    socket.on("order:updated", refresh);
    return () => {
      socket.disconnect();
      setLive(false);
    };
  }, [branchId, load]);

  const role = staff
    ? staff.isSuperAdmin
      ? "Süper admin"
      : staff.memberships.map((m) => m.role).join(", ")
    : "…";

  return (
    <AdminShell
      title="Özet"
      subtitle={`${staff?.name ?? staff?.email ?? ""} · ${role}${live ? " · Canlı" : ""}`}
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
