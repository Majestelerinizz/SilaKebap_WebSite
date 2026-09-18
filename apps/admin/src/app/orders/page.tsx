"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatTryLabel } from "@silakebap/shared";
import {
  apiUrl,
  authHeaders,
  defaultBranchId,
  readStaff,
} from "@/lib/auth";
import styles from "../adminForms.module.css";

type Order = {
  id: string;
  status: string;
  guestName: string;
  totalCents: number;
  fulfillmentType: string;
  paymentMethod: string;
  createdAt: string;
  branch: { name: string };
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const branchId =
      localStorage.getItem("silakebap.selectedBranchId") ||
      defaultBranchId(readStaff());
    const q = branchId ? `?branchId=${branchId}` : "";
    void fetch(`${apiUrl}/api/admin/orders${q}`, { headers: authHeaders() })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Yüklenemedi");
          return;
        }
        setOrders(data.orders ?? []);
      });
  }, []);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>Siparişler</h1>
        <Link href="/dashboard">Yönetim</Link>
      </header>
      {error ? <p className={styles.error}>{error}</p> : null}
      <ul className={styles.list}>
        {orders.map((o) => (
          <li key={o.id} className={styles.card}>
            <div>
              <strong>
                {o.guestName} · {o.status}
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
    </main>
  );
}
