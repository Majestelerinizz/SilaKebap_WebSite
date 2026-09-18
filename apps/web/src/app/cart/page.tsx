"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatTryLabel } from "@silakebap/shared";
import { BrandMark } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
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
  productImageFallback,
  resolveProductImage,
} from "@/lib/media";
import styles from "./cart.module.css";

export default function CartPage() {
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

  const count = cartItemCount(cart);
  const subtotal = useMemo(() => cartSubtotalCents(cart), [cart]);
  const menuHref = cart?.branchId ? `/menu/${cart.branchId}` : "/";

  function bump(index: number, delta: number) {
    const line = cart?.items[index];
    if (!line) return;
    setCart(setLineQuantity(index, line.quantity + delta));
  }

  function remove(index: number) {
    setCart(removeLine(index));
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <BrandMark href={menuHref} size={36} />
        <div className={styles.headerActions}>
          <ThemeToggle />
        </div>
      </header>

      <div className={styles.layout}>
        <section className={styles.main}>
          <h1 className={styles.title}>
            Sepetim {count > 0 ? `(${count} ürün)` : ""}
          </h1>

          {!cart?.items.length ? (
            <div className={styles.empty}>
              <p>Sepetin şu an boş.</p>
              <Link href={menuHref} className={styles.continueBtn}>
                Menüye dön
              </Link>
            </div>
          ) : (
            <ul className={styles.list}>
              {cart.items.map((item, index) => {
                const summary = formatOptionSummary(item.optionLabels);
                const lineTotal =
                  (item.unitPriceCents ?? 0) * item.quantity;
                return (
                  <li key={`${item.productId}-${index}`} className={styles.card}>
                    <div className={styles.cardMedia}>
                      <SafeImage
                        src={resolveProductImage(
                          item.imageSlug,
                          item.imageUrl,
                        )}
                        fallbackSrc={productImageFallback()}
                        alt=""
                        width={96}
                        height={96}
                        className={styles.thumb}
                      />
                    </div>
                    <div className={styles.cardBody}>
                      <div className={styles.cardTop}>
                        <strong>{item.productName ?? "Ürün"}</strong>
                        <button
                          type="button"
                          className={styles.remove}
                          onClick={() => remove(index)}
                          aria-label="Ürünü kaldır"
                        >
                          Sil
                        </button>
                      </div>
                      {summary ? (
                        <p className={styles.options}>{summary}</p>
                      ) : null}
                      {item.note ? (
                        <p className={styles.note}>Not: {item.note}</p>
                      ) : null}
                      <div className={styles.cardFoot}>
                        <div className={styles.qty}>
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
                        <span className={styles.price}>
                          {formatTryLabel(lineTotal)}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {cart?.items.length ? (
            <Link href={menuHref} className={styles.addMore}>
              + Ürün eklemeye devam et
            </Link>
          ) : null}
        </section>

        <aside className={styles.summary}>
          <div className={styles.summaryCard}>
            <p className={styles.summaryLabel}>
              Sepet tutarı {count > 0 ? `(${count})` : ""}
            </p>
            <p className={styles.summaryTotal}>
              {formatTryLabel(subtotal)}
            </p>
            {cart?.items.length ? (
              <Link href="/checkout" className={styles.checkoutBtn}>
                Siparişi tamamla
              </Link>
            ) : (
              <button type="button" className={styles.checkoutBtn} disabled>
                Siparişi tamamla
              </button>
            )}
            <div className={styles.breakdown}>
              <div>
                <span>Ürünler</span>
                <span>{formatTryLabel(subtotal)}</span>
              </div>
              <div>
                <span>Teslimat</span>
                <span>Checkout’ta</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
