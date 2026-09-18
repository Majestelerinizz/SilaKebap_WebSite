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
  items: Array<{
    productName: string;
    quantity: number;
    note: string | null;
    options: Array<{ name: string }>;
  }>;
};

function resolveBranchId(): string {
  const saved = localStorage.getItem("silakebap.selectedBranchId");
  if (saved) return saved;
  return defaultBranchId(readStaff());
}

export default function KitchenPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [branchId, setBranchId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async (bid: string) => {
    const token = readToken();
    if (!token) return;
    const res = await fetch(`${apiUrl}/api/orders/branch/${bid}`, {
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed");
      return;
    }
    setOrders(data.orders);
    setError("");
  }, []);

  useEffect(() => {
    if (!readToken()) {
      setError("Önce giriş yapın");
      return;
    }
    const bid = resolveBranchId();
    if (!bid) {
      setError("Şube bulunamadı");
      return;
    }
    setBranchId(bid);
    void load(bid);
  }, [load]);

  useEffect(() => {
    if (!branchId) return;
    const socket: Socket = io(apiUrl, { transports: ["websocket", "polling"] });
    socket.emit("join:kitchen", branchId);
    socket.on("order:created", () => void load(branchId));
    socket.on("order:updated", () => void load(branchId));
    return () => {
      socket.disconnect();
    };
  }, [branchId, load]);

  async function setStatus(orderId: string, status: string) {
    const res = await fetch(`${apiUrl}/api/orders/${orderId}/status`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ status }),
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
          <h1>Mutfak</h1>
          <Link href="/dashboard">Yönetim</Link>
        </div>
        <button type="button" onClick={() => branchId && load(branchId)}>
          Yenile
        </button>
      </header>
      {error ? <p className={styles.error}>{error}</p> : null}
      <ul className={styles.list}>
        {orders.map((o) => (
          <li key={o.id} className={styles.card}>
            <div className={styles.cardTop}>
              <strong>
                {o.guestName} · {o.guestPhone}
              </strong>
              <span>{o.status}</span>
            </div>
            <p>
              {o.fulfillmentType === "PICKUP" ? "Gel-Al" : "Kurye"} ·{" "}
              {formatTryLabel(o.totalCents)}
            </p>
            <ul className={styles.items}>
              {o.items.map((item, idx) => (
                <li key={`${o.id}-${idx}`}>
                  {item.quantity}× {item.productName}
                  {item.options.length
                    ? ` — ${item.options.map((x) => x.name).join(", ")}`
                    : ""}
                  {item.note ? ` [${item.note}]` : ""}
                </li>
              ))}
            </ul>
            <div className={styles.actions}>
              {o.status === OrderStatus.RECEIVED ? (
                <button
                  type="button"
                  onClick={() => setStatus(o.id, OrderStatus.PREPARING)}
                >
                  Hazırlanıyor
                </button>
              ) : null}
              {o.status === OrderStatus.PREPARING ? (
                <button
                  type="button"
                  onClick={() => setStatus(o.id, OrderStatus.READY)}
                >
                  Hazır
                </button>
              ) : null}
              {o.status === OrderStatus.READY &&
              o.fulfillmentType === "PICKUP" ? (
                <button
                  type="button"
                  onClick={() => setStatus(o.id, OrderStatus.AWAITING_PICKUP)}
                >
                  Teslime hazır
                </button>
              ) : null}
              {o.status === OrderStatus.AWAITING_PICKUP ? (
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
