"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import styles from "./track.module.css";

export default function TrackPage() {
  const router = useRouter();
  const [token, setToken] = useState("");

  function go(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) return;
    router.push(`/track/${token.trim()}`);
  }

  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <BrandMark href="/" size={36} />
        <ThemeToggle />
      </header>
      <h1>Sipariş takip</h1>
      <p className={styles.lead}>
        Sipariş sonrası gelen takip kodunu girerek durumunu görebilirsin.
      </p>
      <form onSubmit={go} className={styles.form}>
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Takip kodu"
          aria-label="Takip kodu"
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
