"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatTryLabel } from "@silakebap/shared";
import { BrandMark } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getApiUrl } from "@/lib/api";
import styles from "../track.module.css";

type OrderView = {
  id: string;
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
    const id = setInterval(() => void load(), 8000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [token]);

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

  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <BrandMark href="/" size={36} />
        <ThemeToggle />
      </header>
      <h1>Sipariş takip</h1>
      <p className={styles.status}>{order.status}</p>
      <p>
        {order.guestName} · {order.fulfillmentType} ·{" "}
        {formatTryLabel(order.totalCents)}
      </p>
      <p className={styles.muted}>
        {order.branch.name}
        {order.branch.phone ? ` · ${order.branch.phone}` : ""}
      </p>
      <p className={styles.muted}>
        Ödeme: {order.paymentStatus} ({order.paymentMethod})
      </p>

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

      <h2>Timeline</h2>
      <ol className={styles.timeline}>
        {order.statusHistory.map((h, idx) => (
          <li key={idx}>
            <strong>{h.toStatus}</strong>
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
