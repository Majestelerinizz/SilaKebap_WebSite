"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import {
  OrderStatus,
  formatTryLabel,
  fulfillmentLabel,
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
import styles from "./kitchen.module.css";

type OrderRow = {
  id: string;
  orderNo?: string;
  status: string;
  guestName: string;
  guestPhone: string;
  fulfillmentType: string;
  totalCents: number;
  createdAt?: string;
  items: Array<{
    productName: string;
    quantity: number;
    note: string | null;
    options: Array<{ name: string }>;
  }>;
};

const HIDDEN_STATUSES = new Set<string>([
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
  OrderStatus.PENDING_PAYMENT,
]);

const KITCHEN_SECTIONS: Array<{
  title: string;
  tone: "new" | "prep" | "ready";
  statuses: string[];
}> = [
  { title: "Yeni", tone: "new", statuses: [OrderStatus.RECEIVED] },
  { title: "Hazırlanıyor", tone: "prep", statuses: [OrderStatus.PREPARING] },
  {
    title: "Hazır",
    tone: "ready",
    statuses: [OrderStatus.READY, OrderStatus.AWAITING_PICKUP],
  },
];

function resolveBranchId(): string {
  const saved = localStorage.getItem("silakebap.selectedBranchId");
  if (saved) return saved;
  return defaultBranchId(readStaff());
}

function OrderCard({
  order,
  onSetStatus,
}: {
  order: OrderRow;
  onSetStatus: (orderId: string, status: string) => void;
}) {
  return (
    <li className={styles.card}>
      <div className={styles.cardTop}>
        <div>
          <p className={styles.orderNo}>{order.orderNo ?? order.id.slice(-8)}</p>
          <strong className={styles.guest}>{order.guestName}</strong>
        </div>
        <span className={styles.badge}>{orderStatusLabel(order.status)}</span>
      </div>
      <p className={styles.meta}>
        {fulfillmentLabel(order.fulfillmentType)} ·{" "}
        {formatTryLabel(order.totalCents)}
      </p>
      <ul className={styles.items}>
        {order.items.map((item, idx) => (
          <li key={`${order.id}-${idx}`}>
            <span className={styles.qty}>{item.quantity}×</span>
            <span>
              {item.productName}
              {item.options.length
                ? ` — ${item.options.map((x) => x.name).join(", ")}`
                : ""}
              {item.note ? (
                <em className={styles.note}> [{item.note}]</em>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      <div className={styles.actions}>
        {order.status === OrderStatus.RECEIVED ? (
          <button
            type="button"
            className={styles.primary}
            onClick={() => onSetStatus(order.id, OrderStatus.PREPARING)}
          >
            Hazırlanıyor
          </button>
        ) : null}
        {order.status === OrderStatus.PREPARING ? (
          <button
            type="button"
            className={styles.primary}
            onClick={() => onSetStatus(order.id, OrderStatus.READY)}
          >
            Hazır
          </button>
        ) : null}
        {order.status === OrderStatus.READY &&
        order.fulfillmentType === "PICKUP" ? (
          <button
            type="button"
            className={styles.primary}
            onClick={() => onSetStatus(order.id, OrderStatus.AWAITING_PICKUP)}
          >
            Teslime hazır
          </button>
        ) : null}
        {order.status === OrderStatus.AWAITING_PICKUP ? (
          <button
            type="button"
            className={styles.ok}
            onClick={() => onSetStatus(order.id, OrderStatus.DELIVERED)}
          >
            Teslim edildi
          </button>
        ) : null}
      </div>
    </li>
  );
}

export default function KitchenPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [branchId, setBranchId] = useState("");
  const [error, setError] = useState("");

  const visibleOrders = useMemo(
    () => orders.filter((o) => !HIDDEN_STATUSES.has(o.status)),
    [orders],
  );

  const load = useCallback(async (bid: string) => {
    if (!readToken()) return;
    const res = await ensureApiAuth(() =>
      fetch(`${apiUrl}/api/orders/branch/${bid}`, {
        headers: authHeaders(),
      }),
    );
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
    const res = await ensureApiAuth(() =>
      fetch(`${apiUrl}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      }),
    );
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
            <h1>Mutfak</h1>
            <div className={styles.headerLinks}>
              <Link href="/dashboard">Yönetim</Link>
              <button type="button" onClick={onLogout}>
                Çıkış
              </button>
            </div>
          </div>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.count}>{visibleOrders.length} aktif</span>
          <button
            type="button"
            className={styles.refresh}
            onClick={() => branchId && load(branchId)}
          >
            Yenile
          </button>
        </div>
      </header>

      {error ? <p className={styles.error}>{error}</p> : null}

      {/* Desktop / TV: kanban */}
      <div className={styles.board}>
        {KITCHEN_SECTIONS.map((section) => {
          const sectionOrders = visibleOrders.filter((o) =>
            section.statuses.includes(o.status),
          );
          return (
            <section
              key={section.title}
              className={`${styles.column} ${styles[section.tone]}`}
            >
              <header className={styles.colHead}>
                <h2>{section.title}</h2>
                <span>{sectionOrders.length}</span>
              </header>
              {sectionOrders.length ? (
                <ul className={styles.list}>
                  {sectionOrders.map((o) => (
                    <OrderCard key={o.id} order={o} onSetStatus={setStatus} />
                  ))}
                </ul>
              ) : (
                <p className={styles.colEmpty}>Boş</p>
              )}
            </section>
          );
        })}
      </div>

      {/* Mobile: stacked sections */}
      <div className={styles.queue}>
        {visibleOrders.length ? (
          KITCHEN_SECTIONS.map((section) => {
            const sectionOrders = visibleOrders.filter((o) =>
              section.statuses.includes(o.status),
            );
            if (!sectionOrders.length) return null;
            return (
              <section
                key={section.title}
                className={`${styles.queueSection} ${styles[section.tone]}`}
              >
                <header className={styles.queueHead}>
                  <h2>{section.title}</h2>
                  <span>{sectionOrders.length}</span>
                </header>
                <ul className={styles.list}>
                  {sectionOrders.map((o) => (
                    <OrderCard key={o.id} order={o} onSetStatus={setStatus} />
                  ))}
                </ul>
              </section>
            );
          })
        ) : !error ? (
          <p className={styles.empty}>Aktif mutfak siparişi yok.</p>
        ) : null}
      </div>
    </main>
  );
}
