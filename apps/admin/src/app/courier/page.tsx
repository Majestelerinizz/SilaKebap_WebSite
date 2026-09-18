"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { OrderStatus, formatTryLabel } from "@silakebap/shared";
import {
  apiUrl,
  authHeaders,
  defaultBranchId,
  readStaff,
  readToken,
} from "@/lib/auth";
import styles from "../panel.module.css";

type OrderRow = {
  id: string;
  status: string;
  guestName: string;
  guestPhone: string;
  fulfillmentType: string;
  totalCents: number;
  addressSnapshot: { line1?: string } | null;
  items: Array<{ productName: string; quantity: number }>;
};

function resolveBranchId(): string {
  const saved = localStorage.getItem("silakebap.selectedBranchId");
  if (saved) return saved;
  return defaultBranchId(readStaff());
}

export default function CourierPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [branchId, setBranchId] = useState("");
  const [courierId, setCourierId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async (bid: string) => {
    if (!readToken()) return;
    const res = await fetch(
      `${apiUrl}/api/orders/branch/${bid}?status=READY,COURIER_ASSIGNED,ON_THE_WAY`,
      { headers: authHeaders() },
    );
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed");
      return;
    }
    setOrders(
      (data.orders as OrderRow[]).filter((o) => o.fulfillmentType === "DELIVERY"),
    );
    setError("");
  }, []);

  useEffect(() => {
    const staff = readStaff();
    if (!readToken() || !staff) {
      setError("Önce giriş yapın");
      return;
    }
    setCourierId(staff.id);
    const bid = resolveBranchId();
    if (bid) {
      setBranchId(bid);
      void load(bid);
    }
  }, [load]);

  useEffect(() => {
    if (!branchId) return;
    const socket: Socket = io(apiUrl, { transports: ["websocket", "polling"] });
    socket.emit("join:courier", branchId);
    socket.on("order:updated", () => void load(branchId));
    return () => {
      socket.disconnect();
    };
  }, [branchId, load]);

  async function setStatus(orderId: string, status: string) {
    const res = await fetch(`${apiUrl}/api/orders/${orderId}/status`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({
        status,
        courierId:
          status === OrderStatus.COURIER_ASSIGNED ? courierId : undefined,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Status update failed");
      return;
    }
    if (branchId) void load(branchId);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Kurye</h1>
          <Link href="/dashboard">Yönetim</Link>
        </div>
        <button type="button" onClick={() => branchId && load(branchId)}>
          Yenile
        </button>
      </header>
      {error ? <p className={styles.error}>{error}</p> : null}
      {!orders.length && !error ? (
        <p className={styles.empty}>Teslimata hazır kurye siparişi yok.</p>
      ) : null}
      <ul className={styles.list}>
        {orders.map((o) => (
          <li key={o.id} className={styles.card}>
            <div className={styles.cardTop}>
              <strong>
                {o.guestName} · {o.guestPhone}
              </strong>
              <span>{o.status}</span>
            </div>
            <p>{formatTryLabel(o.totalCents)}</p>
            {o.addressSnapshot?.line1 ? (
              <p className={styles.addr}>{o.addressSnapshot.line1}</p>
            ) : null}
            <ul className={styles.items}>
              {o.items.map((item, idx) => (
                <li key={`${o.id}-${idx}`}>
                  {item.quantity}× {item.productName}
                </li>
              ))}
            </ul>
            <div className={styles.actions}>
              {o.status === OrderStatus.READY ? (
                <button
                  type="button"
                  onClick={() => setStatus(o.id, OrderStatus.COURIER_ASSIGNED)}
                >
                  Üstlen
                </button>
              ) : null}
              {o.status === OrderStatus.COURIER_ASSIGNED ? (
                <button
                  type="button"
                  onClick={() => setStatus(o.id, OrderStatus.ON_THE_WAY)}
                >
                  Yolda
                </button>
              ) : null}
              {o.status === OrderStatus.ON_THE_WAY ? (
                <button
                  type="button"
                  onClick={() => setStatus(o.id, OrderStatus.DELIVERED)}
                >
                  Teslim edildi
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
