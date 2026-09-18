import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BRAND } from "@/lib/media";
import { apiUrl } from "@/lib/api";
import styles from "./page.module.css";

async function getBranches() {
  try {
    const res = await fetch(`${apiUrl}/api/catalog/branches`, {
      next: { revalidate: 20 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      branches: Array<{
        id: string;
        name: string;
        slug: string;
        isOpen: boolean;
        phone: string | null;
      }>;
    };
    return data.branches;
  } catch {
    return [];
  }
}

const QUICK = [
  { label: "Kebaplar", src: "/menu/categories/kebaplar.jpg" },
  { label: "Dürümler", src: "/menu/categories/durumler.jpg" },
  { label: "Lahmacun", src: "/menu/categories/lahmacun-pide.jpg" },
  { label: "Tatlılar", src: "/menu/categories/tatlilar.jpg" },
  { label: "İçecekler", src: "/menu/categories/icecekler.jpg" },
] as const;

const SOCIAL = {
  instagram: "https://www.instagram.com/",
  facebook: "https://www.facebook.com/",
} as const;

export default async function HomePage() {
  const branches = await getBranches();
  const branch = branches[0];
  const menuHref = branch ? `/menu/${branch.id}` : null;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div
          className={styles.media}
          style={{ backgroundImage: `url(${BRAND.hero})` }}
          aria-hidden
        />
        <div className={styles.scrim} />

        <header className={styles.topBar}>
          <BrandMark inverted size={40} />
          <nav className={styles.topNav}>
            <Link href="/track">Sipariş takip</Link>
            <ThemeToggle onDark />
          </nav>
        </header>

        <div className={styles.heroBody}>
          <p className={styles.status}>
            <span className={styles.dot} aria-hidden />
            {branch?.isOpen !== false ? "Şimdi açık" : "Kapalı"} · 25–40 dk
            {branch?.phone ? (
              <>
                {" · "}
                <a className={styles.phoneLink} href={`tel:${branch.phone}`}>
                  {branch.phone}
                </a>
              </>
            ) : null}
          </p>
          <h1 className={styles.headline}>Mangaldan sofrana</h1>
          <p className={styles.sub}>
            Kurye veya gel-al. Online, kapıda nakit ya da kart.
          </p>
          <div className={styles.actions}>
            {menuHref ? (
              <Link className={styles.cta} href={menuHref} prefetch>
                Sipariş ver
              </Link>
            ) : (
              <span className={styles.ctaMuted}>Menü yakında</span>
            )}
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelInner}>
          <div className={styles.panelHead}>
            <h2>Kategoriler</h2>
            {menuHref ? (
              <Link href={menuHref} className={styles.allLink} prefetch>
                Tüm menü
              </Link>
            ) : null}
          </div>

          <div className={styles.catGrid}>
            {QUICK.map((item) =>
              menuHref ? (
                <Link
                  key={item.label}
                  href={menuHref}
                  className={styles.catCard}
                  prefetch
                >
                  <span
                    className={styles.catImg}
                    style={{ backgroundImage: `url(${item.src})` }}
                    aria-hidden
                  />
                  <span className={styles.catLabel}>{item.label}</span>
                </Link>
              ) : (
                <div key={item.label} className={styles.catCard}>
                  <span
                    className={styles.catImg}
                    style={{ backgroundImage: `url(${item.src})` }}
                    aria-hidden
                  />
                  <span className={styles.catLabel}>{item.label}</span>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <p className={styles.footerBrand}>Sıla Kebap</p>
          <p className={styles.footerText}>Mangaldan sofrana — takip et.</p>
          <div className={styles.socials}>
            <a
              href={SOCIAL.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialLink}
            >
              Instagram
            </a>
            <a
              href={SOCIAL.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialLink}
            >
              Facebook
            </a>
          </div>
          <Link href="/track" className={styles.footerTrack}>
            Sipariş takip
          </Link>
        </div>
      </footer>
    </main>
  );
}
