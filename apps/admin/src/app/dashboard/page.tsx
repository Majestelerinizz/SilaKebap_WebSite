"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  apiUrl,
  authHeaders,
  clearSession,
  defaultBranchId,
  readStaff,
  type StaffUser,
} from "@/lib/auth";
import styles from "./page.module.css";

type NavLink = { href: string; label: string };

function navLinksFor(staff: StaffUser): NavLink[] {
  if (staff.isSuperAdmin) {
    return [
      { href: "/kitchen", label: "Mutfak" },
      { href: "/courier", label: "Kurye" },
      { href: "/products", label: "Ürünler" },
      { href: "/zones", label: "Bölgeler / Saat" },
      { href: "/coupons", label: "Kuponlar" },
      { href: "/orders", label: "Siparişler" },
      { href: "/integrations", label: "Entegrasyonlar" },
    ];
  }

  const roles = new Set(staff.memberships.map((m) => m.role));
  const links: NavLink[] = [];
  if (roles.has("KITCHEN")) {
    links.push({ href: "/kitchen", label: "Mutfak" });
  }
  if (roles.has("COURIER")) {
    links.push({ href: "/courier", label: "Kurye" });
  }
  return links;
}

export default function DashboardPage() {
  const router = useRouter();
  const [info, setInfo] = useState("");
  const [branchId, setBranchId] = useState("");
  const [staff, setStaff] = useState<StaffUser | null>(null);
  const [branches, setBranches] = useState<
    Array<{ id: string; name: string }>
  >([]);

  const navLinks = useMemo(
    () => (staff ? navLinksFor(staff) : []),
    [staff],
  );

  useEffect(() => {
    const s = readStaff();
    if (!s) {
      setInfo("Önce giriş yapın");
      return;
    }
    setStaff(s);
    setInfo(
      `${s.name ?? s.email} · ${s.isSuperAdmin ? "SUPER_ADMIN" : s.memberships.map((m) => m.role).join(", ")}`,
    );
    setBranchId(defaultBranchId(s));
    if (s.isSuperAdmin) {
      void fetch(`${apiUrl}/api/catalog/branches`, { headers: authHeaders() })
        .then((r) => r.json())
        .then((d) => setBranches(d.branches ?? []));
    }
  }, []);

  function onLogout() {
    clearSession();
    router.push("/login");
  }

  return (
    <main className={styles.page}>
      <div className={styles.topBar}>
        <h1>Yönetim</h1>
        <button type="button" className={styles.logout} onClick={onLogout}>
          Çıkış
        </button>
      </div>
      <p>{info}</p>
      {branches.length > 0 ? (
        <label className={styles.branch}>
          Şube
          <select
            value={branchId}
            onChange={(e) => {
              setBranchId(e.target.value);
              localStorage.setItem("silakebap.selectedBranchId", e.target.value);
            }}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <nav className={styles.nav}>
        {navLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
