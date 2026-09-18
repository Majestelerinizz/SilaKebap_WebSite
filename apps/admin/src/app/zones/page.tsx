"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatTryLabel } from "@silakebap/shared";
import {
  apiUrl,
  authHeaders,
  defaultBranchId,
  readStaff,
} from "@/lib/auth";
import styles from "../adminForms.module.css";

type Zone = {
  id: string;
  name: string;
  feeCents: number;
  neighborhoods: string[];
  isActive: boolean;
};

type Hours = {
  id: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
};

const DAYS = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

export default function ZonesPage() {
  const [branchId, setBranchId] = useState("");
  const [zones, setZones] = useState<Zone[]>([]);
  const [hours, setHours] = useState<Hours[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const [zoneName, setZoneName] = useState("");
  const [fee, setFee] = useState("40");
  const [neighborhoods, setNeighborhoods] = useState("Moda, Caferağa");
  const [error, setError] = useState("");

  async function load(bid: string) {
    const [zRes, hRes, bRes] = await Promise.all([
      fetch(`${apiUrl}/api/admin/branches/${bid}/zones`, {
        headers: authHeaders(),
      }),
      fetch(`${apiUrl}/api/admin/branches/${bid}/hours`, {
        headers: authHeaders(),
      }),
      fetch(`${apiUrl}/api/catalog/branches/${bid}`),
    ]);
    const zData = await zRes.json();
    const hData = await hRes.json();
    const bData = await bRes.json();
    if (!zRes.ok) {
      setError(zData.error ?? "Yüklenemedi");
      return;
    }
    setZones(zData.zones ?? []);
    setHours(hData.hours ?? []);
    setIsOpen(Boolean(bData.branch?.isOpen));
  }

  useEffect(() => {
    const bid =
      localStorage.getItem("silakebap.selectedBranchId") ||
      defaultBranchId(readStaff());
    setBranchId(bid);
    if (bid) void load(bid);
  }, []);

  async function addZone(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`${apiUrl}/api/admin/branches/${branchId}/zones`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        name: zoneName,
        feeCents: Math.round(Number(fee) * 100),
        neighborhoods: neighborhoods
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Eklenemedi");
      return;
    }
    setZoneName("");
    void load(branchId);
  }

  async function toggleOpen() {
    const res = await fetch(`${apiUrl}/api/admin/branches/${branchId}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ isOpen: !isOpen }),
    });
    if (res.ok) setIsOpen(!isOpen);
  }

  async function saveHour(dayOfWeek: number, openTime: string, closeTime: string) {
    await fetch(`${apiUrl}/api/admin/branches/${branchId}/hours`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ dayOfWeek, openTime, closeTime, isClosed: false }),
    });
    void load(branchId);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>Bölgeler / Saat</h1>
        <Link href="/dashboard">Yönetim</Link>
      </header>
      {error ? <p className={styles.error}>{error}</p> : null}

      <button type="button" className={styles.secondary} onClick={toggleOpen}>
        Şube şu an: {isOpen ? "Açık" : "Kapalı"} (değiştir)
      </button>

      <form className={styles.form} onSubmit={addZone}>
        <h2>Bölge ekle</h2>
        <input
          value={zoneName}
          onChange={(e) => setZoneName(e.target.value)}
          placeholder="Bölge adı"
          required
        />
        <input
          value={fee}
          onChange={(e) => setFee(e.target.value)}
          placeholder="Ücret TL"
        />
        <input
          value={neighborhoods}
          onChange={(e) => setNeighborhoods(e.target.value)}
          placeholder="Mahalleler (virgülle)"
        />
        <button type="submit">Ekle</button>
      </form>

      <ul className={styles.list}>
        {zones.map((z) => (
          <li key={z.id} className={styles.card}>
            <div>
              <strong>{z.name}</strong>
              <span>
                {formatTryLabel(z.feeCents)} · {z.neighborhoods.join(", ")}
              </span>
            </div>
            <span>{z.isActive ? "Aktif" : "Pasif"}</span>
          </li>
        ))}
      </ul>

      <h2>Çalışma saatleri</h2>
      <ul className={styles.list}>
        {hours.map((h) => (
          <li key={h.id} className={styles.card}>
            <strong>{DAYS[h.dayOfWeek]}</strong>
            <span>
              {h.isClosed ? "Kapalı" : `${h.openTime} – ${h.closeTime}`}
            </span>
            <button
              type="button"
              onClick={() => saveHour(h.dayOfWeek, "11:00", "23:00")}
            >
              11–23 yap
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
