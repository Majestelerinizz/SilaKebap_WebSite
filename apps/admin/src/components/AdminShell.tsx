"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  apiUrl,
  authHeaders,
  clearSession,
  defaultBranchId,
  readStaff,
  type StaffUser,
} from "@/lib/auth";
import { adminNavFor } from "@/lib/nav";
import { BrandMark } from "./BrandMark";
import styles from "./AdminShell.module.css";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Hide chrome for login-like surfaces */
  bare?: boolean;
};

export function AdminShell({ title, subtitle, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [staff, setStaff] = useState<StaffUser | null>(null);
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>(
    [],
  );

  const nav = useMemo(() => adminNavFor(staff), [staff]);
  const mobileNav = useMemo(() => {
    const priority = [
      "/dashboard",
      "/orders",
      "/products",
      "/kitchen",
      "/courier",
    ];
    const ranked = [...nav].sort((a, b) => {
      const ai = priority.indexOf(a.href);
      const bi = priority.indexOf(b.href);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    return ranked.slice(0, 5);
  }, [nav]);

  useEffect(() => {
    const s = readStaff();
    if (!s) {
      router.replace("/login");
      return;
    }
    setStaff(s);
    setBranchId(
      localStorage.getItem("silakebap.selectedBranchId") || defaultBranchId(s),
    );
    if (s.isSuperAdmin) {
      void fetch(`${apiUrl}/api/catalog/branches`, { headers: authHeaders() })
        .then((r) => r.json())
        .then((d) => setBranches(d.branches ?? []));
    }
  }, [router]);

  function onLogout() {
    clearSession();
    router.push("/login");
  }

  const roleLabel = staff
    ? staff.isSuperAdmin
      ? "Süper admin"
      : staff.memberships.map((m) => m.role).join(" · ")
    : "";

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sideTop}>
          <BrandMark size="md" />
          <p className={styles.sideMeta}>{roleLabel}</p>
        </div>

        {branches.length > 0 ? (
          <label className={styles.branch}>
            <span>Şube</span>
            <select
              value={branchId}
              onChange={(e) => {
                setBranchId(e.target.value);
                localStorage.setItem(
                  "silakebap.selectedBranchId",
                  e.target.value,
                );
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

        <nav className={styles.sideNav} aria-label="Yönetim">
          {nav.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? styles.navActive : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button type="button" className={styles.logout} onClick={onLogout}>
          Çıkış
        </button>
      </aside>

      <div className={styles.main}>
        <header className={styles.top}>
          <div>
            <h1 className={styles.title}>{title}</h1>
            {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
          </div>
          <div className={styles.topMeta}>
            <span className={styles.userChip}>
              {staff?.name ?? staff?.email ?? "…"}
            </span>
            <button
              type="button"
              className={styles.logoutMobile}
              onClick={onLogout}
            >
              Çıkış
            </button>
          </div>
        </header>
        <div className={styles.content}>{children}</div>
      </div>

      <nav className={styles.bottomNav} aria-label="Mobil menü">
        {mobileNav.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? styles.bottomActive : undefined}
            >
              <span>{item.short}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
