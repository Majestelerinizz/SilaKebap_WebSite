"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import {
  OrderStatus,
  formatTryLabel,
  orderStatusLabel,
} from "@silakebap/shared";
import { BrandMark } from "@/components/BrandMark";
import {
  apiUrl,
  authHeaders,
  clearSession,
  defaultBranchId,
  ensureApiAuth,
  readStaff,
  readToken,
} from "@/lib/auth";
import styles from "./courier.module.css";

type OrderRow = {
  id: string;
  orderNo?: string;
  status: string;
  guestName: string;
  guestPhone: string;
  fulfillmentType: string;
  totalCents: number;
  addressSnapshot: {
    line1?: string;
    district?: string;
    city?: string;
    note?: string;
  } | null;
  items: Array<{ productName: string; quantity: number }>;
};

function resolveBranchId(): string {
  const saved = localStorage.getItem("silakebap.selectedBranchId");
  if (saved) return saved;
  return defaultBranchId(readStaff());
}

function addressLine(o: OrderRow): string {
  const a = o.addressSnapshot;
  if (!a) return "Adres yok";
  return [a.line1, a.district, a.city].filter(Boolean).join(", ") || "Adres yok";
}

export default function CourierPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [branchId, setBranchId] = useState("");
  const [courierId, setCourierId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async (bid: string) => {
    if (!readToken()) return;
    const res = await ensureApiAuth(() =>
      fetch(
        `${apiUrl}/api/orders/branch/${bid}?status=READY,COURIER_ASSIGNED,ON_THE_WAY`,
        { headers: authHeaders() },
      ),
    );
    const data = await res.json();
    if (res.status === 401) {
      clearSession();
      router.replace("/login");
      return;
    }
    if (!res.ok) {
      setError(data.error ?? "Failed");
      return;
    }
    setOrders(
      (data.orders as OrderRow[]).filter((o) => o.fulfillmentType === "DELIVERY"),
    );
    setError("");
  }, [router]);

  useEffect(() => {
    const staff = readStaff();
    if (!readToken() || !staff) {
      clearSession();
      router.replace("/login");
      return;
    }
    setCourierId(staff.id);
    const bid = resolveBranchId();
    if (bid) {
      setBranchId(bid);
      void load(bid);
    }
  }, [load, router]);

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
    const res = await ensureApiAuth(() =>
      fetch(`${apiUrl}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          status,
          courierId:
            status === OrderStatus.COURIER_ASSIGNED ? courierId : undefined,
        }),
      }),
    );
    if (res.status === 401) {
      clearSession();
      router.replace("/login");
      return;
    }
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Status update failed");
      return;
    }
    if (branchId) void load(branchId);
  }

  function onLogout() {
    clearSession();
    router.push("/login");
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brandRow}>
          <BrandMark size="sm" showWordmark={false} />
          <div>
            <h1>Kurye</h1>
            <div className={styles.headerLinks}>
              <Link href="/dashboard">Yönetim</Link>
              <button type="button" onClick={onLogout}>
                Çıkış
              </button>
            </div>
          </div>
        </div>
        <button
          type="button"
          className={styles.refresh}
          onClick={() => branchId && load(branchId)}
        >
          Yenile
        </button>
      </header>

      {error ? <p className={styles.error}>{error}</p> : null}
      {!orders.length && !error ? (
        <p className={styles.empty}>Teslimata hazır sipariş yok.</p>
      ) : null}

      <ul className={styles.list}>
        {orders.map((o) => (
          <li key={o.id} className={styles.card}>
            <div className={styles.cardTop}>
              <div>
                <p className={styles.orderNo}>{o.orderNo ?? o.id.slice(-8)}</p>
                <strong>{o.guestName}</strong>
              </div>
              <span className={styles.badge}>{orderStatusLabel(o.status)}</span>
            </div>

            <p className={styles.addr}>{addressLine(o)}</p>
            {o.addressSnapshot?.note ? (
              <p className={styles.addrNote}>{o.addressSnapshot.note}</p>
            ) : null}

            <div className={styles.callRow}>
              <a className={styles.call} href={`tel:${o.guestPhone}`}>
                Ara · {o.guestPhone}
              </a>
              <span className={styles.total}>{formatTryLabel(o.totalCents)}</span>
            </div>

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
                  className={styles.primary}
                  onClick={() => setStatus(o.id, OrderStatus.COURIER_ASSIGNED)}
                >
                  Aldım
                </button>
              ) : null}
              {o.status === OrderStatus.COURIER_ASSIGNED ? (
                <button
                  type="button"
                  className={styles.primary}
                  onClick={() => setStatus(o.id, OrderStatus.ON_THE_WAY)}
                >
                  Yoldayım
                </button>
              ) : null}
              {o.status === OrderStatus.ON_THE_WAY ? (
                <button
                  type="button"
                  className={styles.ok}
                  onClick={() => setStatus(o.id, OrderStatus.DELIVERED)}
                >
                  Teslim
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
