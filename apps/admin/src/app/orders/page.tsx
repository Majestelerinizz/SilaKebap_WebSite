"use client";

import { useCallback, useEffect, useState } from "react";
import { formatTryLabel, orderStatusLabel } from "@silakebap/shared";
import { AdminShell } from "@/components/AdminShell";
import {
  apiFetch,
  apiUrl,
  clearSession,
  resolveActiveBranchId,
} from "@/lib/auth";
import { watchOrders } from "@/lib/realtime";
import { useRouter } from "next/navigation";
import styles from "../adminForms.module.css";

type Order = {
  id: string;
  orderNo?: string;
  status: string;
  guestName: string;
  totalCents: number;
  fulfillmentType: string;
  paymentMethod: string;
  createdAt: string;
  branch: { name: string };
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [branchId, setBranchId] = useState("");
  const [live, setLive] = useState(false);

  const load = useCallback(
    async (bid: string) => {
      const q = bid ? `?branchId=${bid}` : "";
      const res = await apiFetch(`${apiUrl}/api/admin/orders${q}`);
      if (res.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Yüklenemedi");
        return;
      }
      setError("");
      setOrders(data.orders ?? []);
    },
    [router],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const bid = await resolveActiveBranchId();
      if (cancelled) return;
      setBranchId(bid);
      await load(bid);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    if (!branchId) return;
    return watchOrders({
      branchId,
      room: "admin",
      onChange: () => void load(branchId),
      onLive: setLive,
    });
  }, [branchId, load]);

  return (
    <AdminShell
      title="Siparişler"
      subtitle={live ? "Canlı · şube siparişleri" : "Şube sipariş geçmişi"}
    >
      {error ? <p className={styles.error}>{error}</p> : null}
      <ul className={styles.list}>
        {orders.map((o) => (
          <li key={o.id} className={styles.card}>
            <div>
              <strong>
                {o.orderNo ? `${o.orderNo} · ` : ""}
                {o.guestName} · {orderStatusLabel(o.status)}
              </strong>
              <span>
                {o.branch.name} · {o.fulfillmentType} · {o.paymentMethod} ·{" "}
                {formatTryLabel(o.totalCents)}
              </span>
              <span>{new Date(o.createdAt).toLocaleString("tr-TR")}</span>
            </div>
          </li>
        ))}
      </ul>
      {!orders.length && !error ? (
        <p className={styles.hint}>Henüz sipariş yok.</p>
      ) : null}
    </AdminShell>
  );
}
