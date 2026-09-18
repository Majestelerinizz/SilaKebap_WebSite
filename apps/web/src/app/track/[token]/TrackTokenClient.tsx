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
  orderNo: string;
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
    unitPriceCents?: number;
    lineTotalCents?: number;
    options: Array<{ name: string }>;
  }>;
  statusHistory: Array<{ toStatus: string; createdAt: string; note: string | null }>;
  createdAt: string;
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

function copyText(text: string) {
  void navigator.clipboard?.writeText(text);
}

export default function TrackTokenClient({ token }: { token: string }) {
  const [order, setOrder] = useState<OrderView | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

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
        <header className={styles.top}>
          <BrandMark href="/" size={36} />
          <ThemeToggle />
        </header>
        <p>{error}</p>
        <div className={styles.actions}>
          <Link href="/track" className={styles.homeBtn}>
            Sipariş No ile ara
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
        <header className={styles.top}>
          <BrandMark href="/" size={36} />
          <ThemeToggle />
        </header>
        <p>Yükleniyor…</p>
        <Link href="/" className={styles.homeBtnGhost}>
          Ana sayfaya dön
        </Link>
      </main>
    );
  }

  const cancelled = order.status === OrderStatus.CANCELLED;
  const pendingPayment = order.status === OrderStatus.PENDING_PAYMENT;
  const itemCount = order.items.reduce((n, i) => n + i.quantity, 0);
  const isDelivery = order.fulfillmentType === FulfillmentType.DELIVERY;
  const createdLabel = new Date(order.createdAt).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  function onCopy() {
    copyText(order!.orderNo);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <main className={styles.pageWide}>
      <header className={styles.top}>
        <BrandMark href="/" size={36} />
        <ThemeToggle />
      </header>

      <h1>Sipariş takip</h1>
      <p className={styles.lead}>
        Sipariş No ile sorguladın · durum her 8 sn güncellenir.
      </p>

      <article className={styles.cargoCard}>
        <div className={styles.cargoHead}>
          <div className={styles.cargoHeadLeft}>
            <strong>{order.branch.name}</strong>
            {order.branch.phone ? (
              <a className={styles.followBtn} href={`tel:${order.branch.phone}`}>
                Ara
              </a>
            ) : null}
          </div>
          <span className={styles.orderNoBadge}>Sipariş No: {order.orderNo}</span>
        </div>

        {cancelled ? (
          <p className={styles.cancelled}>Sipariş iptal edildi.</p>
        ) : pendingPayment ? (
          <p className={styles.pendingPay}>
            Ödeme tamamlandığında sipariş işleme alınır.
          </p>
        ) : (
          <ol className={styles.cargoSteps} aria-label="Sipariş aşamaları">
            {steps.map((step, idx) => {
              const done =
                order.status === OrderStatus.DELIVERED
                  ? idx <= activeStepIndex
                  : idx < activeStepIndex;
              const current = idx === activeStepIndex;
              let cls = styles.cargoStep;
              if (done) cls += ` ${styles.cargoStepDone}`;
              if (current) cls += ` ${styles.cargoStepCurrent}`;
              return (
                <li key={step} className={cls}>
                  <span className={styles.cargoDot} aria-hidden>
                    {done || current ? "✓" : ""}
                  </span>
                  <span className={styles.cargoStepLabel}>
                    {orderStatusLabel(step)}
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        <div className={styles.shipBanner}>
          <div className={styles.shipLeft}>
            <p className={styles.shipTitle}>
              {isDelivery ? "Kurye teslimat" : "Gel-Al"} · {itemCount} ürün
            </p>
            <p className={styles.shipMeta}>Sipariş tarihi: {createdLabel}</p>
            <p className={styles.shipMeta}>
              {order.guestName} · {fulfillmentLabel(order.fulfillmentType)} ·{" "}
              {paymentMethodLabel(order.paymentMethod)} (
              {paymentStatusLabel(order.paymentStatus)})
            </p>
          </div>
          <div className={styles.shipRight}>
            <p className={styles.shipNo}>
              Sipariş No: <strong>{order.orderNo}</strong>
              <button
                type="button"
                className={styles.copyBtn}
                onClick={onCopy}
                aria-label="Sipariş numarasını kopyala"
              >
                {copied ? "✓" : "⧉"}
              </button>
            </p>
            <p className={styles.statusPill}>{orderStatusLabel(order.status)}</p>
          </div>
        </div>

        <div className={styles.productGrid}>
          {order.items.map((item, idx) => (
            <div key={idx} className={styles.productCard}>
              <div className={styles.productThumb} aria-hidden>
                {item.productName.slice(0, 1)}
              </div>
              <div className={styles.productInfo}>
                <p className={styles.productName}>{item.productName}</p>
                {item.options.length ? (
                  <p className={styles.productOpts}>
                    {item.options.map((o) => o.name).join(", ")}
                  </p>
                ) : null}
                <p className={styles.productQty}>{item.quantity} adet</p>
                <p className={styles.productPrice}>
                  {formatTryLabel(
                    item.lineTotalCents ??
                      (item.unitPriceCents ?? 0) * item.quantity,
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.cargoFooter}>
          <span>Toplam</span>
          <strong>{formatTryLabel(order.totalCents)}</strong>
        </div>
      </article>

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
