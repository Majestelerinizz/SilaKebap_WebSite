"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getApiUrl } from "@/lib/api";

export default function IyzicoStubClient() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") ?? "";
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMessage("");
  }, [orderId]);

  async function simulate() {
    const res = await fetch(`${getApiUrl()}/api/payments/iyzico/callback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, simulateSuccess: true }),
    });
    const data = await res.json();
    setMessage(JSON.stringify(data, null, 2));
  }

  return (
    <main style={{ padding: "2rem", maxWidth: 480, margin: "0 auto" }}>
      <h1>iyzico sandbox stub</h1>
      <p>Gerçek key yokken ödeme başarısını simüle eder.</p>
      <p>Order: {orderId || "—"}</p>
      <button type="button" onClick={simulate} disabled={!orderId}>
        Ödemeyi onayla (simulate)
      </button>
      <pre>{message}</pre>
    </main>
  );
}
