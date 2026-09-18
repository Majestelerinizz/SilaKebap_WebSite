"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import styles from "./track.module.css";

export default function TrackPage() {
  const router = useRouter();
  const [orderNo, setOrderNo] = useState("");

  function go(e: React.FormEvent) {
    e.preventDefault();
    const q = orderNo.trim().toUpperCase();
    if (!q) return;
    router.push(`/track/${q}`);
  }

  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <BrandMark href="/" size={36} />
        <ThemeToggle />
      </header>
      <h1>Sipariş takip</h1>
      <p className={styles.lead}>
        Sipariş numaranı girerek durumunu anlık takip edebilirsin.
      </p>
      <form onSubmit={go} className={styles.form}>
        <input
          value={orderNo}
          onChange={(e) => setOrderNo(e.target.value)}
          placeholder="Sipariş No (ör. SK8A3F2B1C)"
          aria-label="Sipariş No"
          autoCapitalize="characters"
          required
        />
        <button type="submit">Getir</button>
      </form>
      <Link href="/" className={styles.homeBtn}>
        Ana sayfaya dön
      </Link>
    </main>
  );
}
