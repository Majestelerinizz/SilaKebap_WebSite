import { Suspense } from "react";
import IyzicoStubClient from "./stub-client";

export default function IyzicoStubPage() {
  return (
    <Suspense fallback={<main style={{ padding: "2rem" }}>Yükleniyor…</main>}>
      <IyzicoStubClient />
    </Suspense>
  );
}
