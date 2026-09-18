"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  DELIVERY_STEPS,
  FulfillmentType,
  OrderStatus,
  PICKUP_STEPS,
  formatTryLabel,
  fulfillmentLabel,
  orderStatusLabel,
  paymentMethodLabel,
} from "@silakebap/shared";
import { BrandMark } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getApiUrl } from "@/lib/api";
import styles from "../track.module.css";

type OrderView = {
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  fulfillmentType: string;
  totalCents: number;
  guestName: string;
  branch: { name: string; phone: string | null };
  items: Array<{
    productName: string;
    quantity: number;
    options: Array<{ name: string }>;
  }>;
  statusHistory: Array<{ toStatus: string; createdAt: string; note: string | null }>;
};

const PAYMENT_STATUS_TR: Record<string, string> = {
  PENDING: "Beklemede",
  PAID: "Ödendi",
  FAILED: "Başarısız",
  REFUNDED: "İade edildi",
  UNPAID: "Ödenmedi",
};

function paymentStatusLabel(status: string): string {
  return PAYMENT_STATUS_TR[status] ?? status;
}

export default function TrackTokenClient({ token }: { token: string }) {
  const [order, setOrder] = useState<OrderView | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch(`${getApiUrl()}/api/orders/track/${token}`);
      const json = await res.json();
      if (cancelled) return;
      if (!res.ok) {
        setError(json.error ?? "Sipariş bulunamadı");
        return;
      }
      setOrder(json.order);
    }
    void load();
    const pollId = setInterval(() => void load(), 8000);
    return () => {
      cancelled = true;
      clearInterval(pollId);
    };
  }, [token]);

  const steps = useMemo(() => {
    if (!order) return [];
    return order.fulfillmentType === FulfillmentType.PICKUP
      ? [...PICKUP_STEPS]
      : [...DELIVERY_STEPS];
  }, [order]);

  const activeStepIndex = useMemo(() => {
    if (!order) return -1;
    if (order.status === OrderStatus.CANCELLED) return -1;
    if (order.status === OrderStatus.PENDING_PAYMENT) return -1;
    const idx = steps.indexOf(order.status as (typeof steps)[number]);
    if (idx >= 0) return idx;
    if (order.status === OrderStatus.DELIVERED) return steps.length - 1;
    return -1;
  }, [order, steps]);

  if (error) {
    return (
      <main className={styles.page}>
        <p>{error}</p>
        <div className={styles.actions}>
          <Link href="/track" className={styles.homeBtn}>
            Token ile ara
          </Link>
          <Link href="/" className={styles.homeBtnGhost}>
            Ana sayfaya dön
          </Link>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className={styles.page}>
        <p>Yükleniyor…</p>
        <Link href="/" className={styles.homeBtnGhost}>
          Ana sayfaya dön
        </Link>
      </main>
    );
  }

  const cancelled = order.status === OrderStatus.CANCELLED;
  const pendingPayment = order.status === OrderStatus.PENDING_PAYMENT;

  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <BrandMark href="/" size={36} />
        <ThemeToggle />
      </header>
      <h1>Sipariş takip</h1>
      <p className={styles.status}>{orderStatusLabel(order.status)}</p>
      <p>
        {order.guestName} · {fulfillmentLabel(order.fulfillmentType)} ·{" "}
        {formatTryLabel(order.totalCents)}
      </p>
      <p className={styles.muted}>
        {order.branch.name}
        {order.branch.phone ? ` · ${order.branch.phone}` : ""}
      </p>
      <p className={styles.muted}>
        Ödeme: {paymentStatusLabel(order.paymentStatus)} (
        {paymentMethodLabel(order.paymentMethod)})
      </p>

      {cancelled ? (
        <p className={styles.cancelled}>Sipariş iptal edildi.</p>
      ) : pendingPayment ? (
        <p className={styles.pendingPay}>Ödeme tamamlandığında sipariş işleme alınır.</p>
      ) : (
        <ol className={styles.steps} aria-label="Sipariş aşamaları">
          {steps.map((step, idx) => {
            const done =
              order.status === OrderStatus.DELIVERED
                ? idx <= activeStepIndex
                : idx < activeStepIndex;
            const current = idx === activeStepIndex;
            let stepClass = styles.step;
            if (done) stepClass += ` ${styles.stepDone}`;
            if (current) stepClass += ` ${styles.stepCurrent}`;
            return (
              <li key={step} className={stepClass}>
                <span className={styles.stepDot} aria-hidden />
                {orderStatusLabel(step)}
              </li>
            );
          })}
        </ol>
      )}

      <h2>Ürünler</h2>
      <ul className={styles.list}>
        {order.items.map((item, idx) => (
          <li key={idx}>
            {item.quantity}× {item.productName}
            {item.options.length
              ? ` (${item.options.map((o) => o.name).join(", ")})`
              : ""}
          </li>
        ))}
      </ul>

      <h2>Durum geçmişi</h2>
      <ol className={styles.timeline}>
        {order.statusHistory.map((h, idx) => (
          <li key={idx}>
            <strong>{orderStatusLabel(h.toStatus)}</strong>
            <span>{new Date(h.createdAt).toLocaleString("tr-TR")}</span>
            {h.note ? <em>{h.note}</em> : null}
          </li>
        ))}
      </ol>

      <div className={styles.actions}>
        <Link href="/" className={styles.homeBtn}>
          Ana sayfaya dön
        </Link>
        <Link href="/track" className={styles.homeBtnGhost}>
          Başka sipariş ara
        </Link>
      </div>
    </main>
  );
}
