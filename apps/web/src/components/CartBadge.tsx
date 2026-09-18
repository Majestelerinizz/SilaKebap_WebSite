"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cartItemCount, readCart } from "@/lib/cart";
import styles from "./CartBadge.module.css";

export function CartBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sync = () => setCount(cartItemCount(readCart()));
    sync();
    window.addEventListener("silakebap:cart", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("silakebap:cart", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return (
    <Link href="/cart" className={styles.badge} aria-label={`Sepet ${count}`}>
      Sepet{count > 0 ? ` (${count})` : ""}
    </Link>
  );
}
