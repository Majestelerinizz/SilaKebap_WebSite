"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { readCart } from "@/lib/cart";

/** Sepet artık menü sağ panelinde — /cart menüye yönlendirir. */
export default function CartPage() {
  const router = useRouter();

  useEffect(() => {
    const cart = readCart();
    const href = cart?.branchId ? `/menu/${cart.branchId}` : "/";
    router.replace(href);
  }, [router]);

  return (
    <main style={{ padding: "2rem", textAlign: "center" }}>
      <p>Menüye yönlendiriliyorsunuz…</p>
    </main>
  );
}
