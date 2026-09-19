"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatTryLabel } from "@silakebap/shared";
import { SafeImage } from "@/components/SafeImage";
import {
  cartItemCount,
  cartSubtotalCents,
  formatOptionSummary,
  readCart,
  removeLine,
  setLineQuantity,
  type Cart,
} from "@/lib/cart";
import {
  categoryImageFallback,
  resolveCategoryImage,
} from "@/lib/media";
import styles from "./menu.module.css";

type Cat = { id: string; name: string; slug: string };

export function sectionDomId(slug: string) {
  return `cat-${slug}`;
}

function stickyOffsetPx() {
  return 160;
}

export function CategoryRail({ categories }: { categories: Cat[] }) {
  const [active, setActive] = useState(categories[0]?.slug ?? "");
  const navRef = useRef<HTMLElement>(null);
  const lockRef = useRef(false);

  function scrollToSlug(slug: string, behavior: ScrollBehavior) {
    const el = document.getElementById(sectionDomId(slug));
    if (!el) return;
    const y =
      el.getBoundingClientRect().top + window.scrollY - stickyOffsetPx();
    window.scrollTo({ top: Math.max(0, y), behavior });
  }

  function centerActiveChip(slug: string) {
    const nav = navRef.current;
    if (!nav) return;
    const btn = nav.querySelector<HTMLElement>(`[data-slug="${slug}"]`);
    if (!btn) return;
    const left =
      btn.offsetLeft - nav.clientWidth / 2 + btn.offsetWidth / 2;
    nav.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }

  useEffect(() => {
    if (!categories.length) return;

    const applyHash = (smooth: boolean) => {
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash) return;
      const slug = hash.startsWith("cat-") ? hash.slice(4) : hash;
      if (!categories.some((c) => c.slug === slug)) return;
      setActive(slug);
      lockRef.current = true;
      scrollToSlug(slug, smooth ? "smooth" : "auto");
      centerActiveChip(slug);
      window.setTimeout(() => {
        lockRef.current = false;
      }, 600);
    };

    applyHash(false);
    const t1 = window.setTimeout(() => applyHash(true), 120);
    const t2 = window.setTimeout(() => applyHash(false), 450);

    const onHash = () => applyHash(true);
    window.addEventListener("hashchange", onHash);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("hashchange", onHash);
    };
  }, [categories]);

  useEffect(() => {
    if (!categories.length) return;

    const onScroll = () => {
      if (lockRef.current) return;
      const offset = stickyOffsetPx();
      let current = categories[0]?.slug ?? "";
      for (const c of categories) {
        const el = document.getElementById(sectionDomId(c.slug));
        if (!el) continue;
        if (el.getBoundingClientRect().top - offset <= 12) current = c.slug;
      }
      setActive((prev) => (prev === current ? prev : current));
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [categories]);

  useEffect(() => {
    centerActiveChip(active);
  }, [active]);

  function goTo(slug: string) {
    setActive(slug);
    lockRef.current = true;
    scrollToSlug(slug, "smooth");
    centerActiveChip(slug);
    history.replaceState(null, "", `#${slug}`);
    window.setTimeout(() => {
      lockRef.current = false;
    }, 700);
  }

  return (
    <nav ref={navRef} className={styles.catNav} aria-label="Kategoriler">
      {categories.map((c) => (
        <button
          key={c.id}
          type="button"
          data-slug={c.slug}
          className={`${styles.catItem} ${active === c.slug ? styles.catItemOn : ""}`}
          aria-current={active === c.slug ? "true" : undefined}
          onClick={() => goTo(c.slug)}
        >
          <SafeImage
            src={resolveCategoryImage(c.slug)}
            fallbackSrc={categoryImageFallback()}
            alt=""
            width={44}
            height={44}
            className={styles.catItemImg}
          />
          <span>{c.name}</span>
        </button>
      ))}
    </nav>
  );
}

/** Sağ sepet paneli — CategoryRail ile aynı client chunk (webpack güvenli). */
export function MenuCartSidebar({ branchId }: { branchId: string }) {
  const [cart, setCart] = useState<Cart | null>(null);

  useEffect(() => {
    const sync = () => setCart(readCart());
    sync();
    window.addEventListener("silakebap:cart", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("silakebap:cart", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const forBranch = cart && cart.branchId === branchId ? cart : null;
  const count = cartItemCount(forBranch);
  const subtotal = cartSubtotalCents(forBranch);

  function bump(index: number, delta: number) {
    const line = forBranch?.items[index];
    if (!line) return;
    setCart(setLineQuantity(index, line.quantity + delta));
  }

  function remove(index: number) {
    setCart(removeLine(index));
  }

  return (
    <>
      <aside className={styles.cartPanel} aria-label="Sepet">
        <div className={styles.cartHead}>
          <strong>Sepetiniz</strong>
          <span>{count > 0 ? `${count} ürün` : "Boş"}</span>
        </div>

        {!forBranch?.items.length ? (
          <p className={styles.cartEmpty}>
            Ürün ekle, burada görünecek. Min. 150 TL.
          </p>
        ) : (
          <ul className={styles.cartList}>
            {forBranch.items.map((item, index) => {
              const summary = formatOptionSummary(item.optionLabels);
              const lineTotal = (item.unitPriceCents ?? 0) * item.quantity;
              return (
                <li
                  key={`${item.productId}-${index}`}
                  className={styles.cartLine}
                >
                  <div className={styles.cartLineTop}>
                    <strong>{item.productName ?? "Ürün"}</strong>
                    <button
                      type="button"
                      className={styles.cartRemove}
                      onClick={() => remove(index)}
                      aria-label="Kaldır"
                    >
                      ×
                    </button>
                  </div>
                  {summary ? (
                    <p className={styles.cartOpts}>{summary}</p>
                  ) : null}
                  <div className={styles.cartLineFoot}>
                    <div className={styles.cartQty}>
                      <button
                        type="button"
                        onClick={() => bump(index, -1)}
                        aria-label="Azalt"
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => bump(index, 1)}
                        aria-label="Artır"
                      >
                        +
                      </button>
                    </div>
                    <em>{formatTryLabel(lineTotal)}</em>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className={styles.cartFooter}>
          <div className={styles.cartTotal}>
            <span>Ara toplam</span>
            <strong>{formatTryLabel(subtotal)}</strong>
          </div>
          <Link
            href="/checkout"
            className={styles.cartCheckout}
            aria-disabled={count === 0}
            tabIndex={count === 0 ? -1 : undefined}
            onClick={(e) => {
              if (count === 0) e.preventDefault();
            }}
          >
            Siparişi tamamla
          </Link>
        </div>
      </aside>

      {count > 0 ? (
        <Link href="/checkout" className={styles.cartMobileBar}>
          <span>Sepet · {count} ürün</span>
          <strong>{formatTryLabel(subtotal)}</strong>
        </Link>
      ) : null}
    </>
  );
}
