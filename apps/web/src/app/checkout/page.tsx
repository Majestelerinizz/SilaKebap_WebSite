"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  FulfillmentType,
  PaymentMethod,
  formatTryLabel,
} from "@silakebap/shared";
import { BrandMark } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getApiUrl } from "@/lib/api";
import {
  clearCart,
  formatOptionSummary,
  readCart,
  toCheckoutItems,
  type Cart,
} from "@/lib/cart";
import styles from "./checkout.module.css";

type Zone = {
  id: string;
  name: string;
  feeCents: number;
  neighborhoods: string[] | null;
};

type Quote = {
  subtotalCents: number;
  deliveryFeeCents: number;
  discountCents: number;
  totalCents: number;
};

function localizeApiError(message: string): string {
  const min = message.match(/Minimum order is (\d+) kuruş/);
  if (min) {
    return `Minimum sipariş tutarı: ${formatTryLabel(Number(min[1]))}`;
  }
  return message;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState<string>(
    FulfillmentType.DELIVERY,
  );
  const [paymentMethod, setPaymentMethod] = useState<string>(
    PaymentMethod.CASH_ON_DELIVERY,
  );
  const [line1, setLine1] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [deliveryZoneId, setDeliveryZoneId] = useState("");
  const [zones, setZones] = useState<Zone[]>([]);
  const [zonesError, setZonesError] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  useEffect(() => {
    const sync = () => setCart(readCart());
    sync();
    window.addEventListener("silakebap:cart", sync);
    return () => window.removeEventListener("silakebap:cart", sync);
  }, []);

  useEffect(() => {
    if (!cart?.branchId) {
      setZones([]);
      setDeliveryZoneId("");
      setZonesError("");
      return;
    }

    let cancelled = false;
    const branchId = cart.branchId;

    void (async () => {
      setZonesError("");
      try {
        const res = await fetch(
          `${getApiUrl()}/api/catalog/branches/${encodeURIComponent(branchId)}`,
        );
        const data = (await res.json()) as {
          branch?: { deliveryZones?: Zone[] };
          error?: string;
        };

        if (!res.ok) {
          if (res.status === 404) {
            if (!cancelled) {
              setZones([]);
              setDeliveryZoneId("");
              setZonesError(
                "Sepetteki şube artık geçerli değil. Menüden ürünleri yeniden ekleyin.",
              );
            }
            return;
          }
          if (!cancelled) {
            setZonesError(data.error ?? "Teslimat bölgeleri yüklenemedi");
          }
          return;
        }

        const list = (data.branch?.deliveryZones ?? []).filter(
          (z) => z && z.id && z.name,
        );
        if (cancelled) return;

        setZones(list);
        setDeliveryZoneId((prev) => {
          if (prev && list.some((z) => z.id === prev)) return prev;
          return list[0]?.id ?? "";
        });

        if (!list.length) {
          setZonesError(
            "Bu şube için aktif teslimat bölgesi yok. Yönetim panelinden bölge ekleyin.",
          );
        }
      } catch {
        if (!cancelled) {
          setZones([]);
          setDeliveryZoneId("");
          setZonesError("Teslimat bölgeleri yüklenemedi (ağ hatası)");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cart?.branchId]);

  useEffect(() => {
    setNeighborhood("");
  }, [deliveryZoneId]);

  const selectedZone = zones.find((z) => z.id === deliveryZoneId);
  const zoneNeighborhoods = Array.isArray(selectedZone?.neighborhoods)
    ? selectedZone.neighborhoods
    : [];
  const onlinePayment = paymentMethod === PaymentMethod.IYZICO_ONLINE;
  const menuHref = cart?.branchId ? `/menu/${cart.branchId}` : "/";

  useEffect(() => {
    if (fulfillmentType === FulfillmentType.PICKUP) {
      if (
        paymentMethod === PaymentMethod.CASH_ON_DELIVERY ||
        paymentMethod === PaymentMethod.CARD_ON_DELIVERY
      ) {
        setPaymentMethod(PaymentMethod.PAY_AT_STORE);
      }
    } else if (paymentMethod === PaymentMethod.PAY_AT_STORE) {
      setPaymentMethod(PaymentMethod.CASH_ON_DELIVERY);
    }
  }, [fulfillmentType, paymentMethod]);

  const refreshQuote = useCallback(async () => {
    if (!cart?.branchId || !cart.items.length) {
      setQuote(null);
      return;
    }
    if (fulfillmentType === FulfillmentType.DELIVERY && !deliveryZoneId) {
      setQuote(null);
      return;
    }
    setQuoteError("");
    try {
      const body = {
        branchId: cart.branchId,
        fulfillmentType,
        paymentMethod,
        contact: {
          name: name || "Misafir",
          phone: phone || "05000000000",
          email: email || undefined,
        },
        deliveryAddress:
          fulfillmentType === FulfillmentType.DELIVERY
            ? {
                line1: line1 || "Adres",
                city: "İstanbul",
                ...(neighborhood.trim()
                  ? { neighborhood: neighborhood.trim() }
                  : {}),
              }
            : undefined,
        deliveryZoneId:
          fulfillmentType === FulfillmentType.DELIVERY
            ? deliveryZoneId
            : undefined,
        couponCode: couponCode || undefined,
        items: toCheckoutItems(cart),
      };
      const res = await fetch(`${getApiUrl()}/api/checkout/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setQuote(null);
        setQuoteError(localizeApiError(data.error ?? "Fiyat alınamadı"));
        return;
      }
      setQuote({
        subtotalCents: data.subtotalCents,
        deliveryFeeCents: data.deliveryFeeCents,
        discountCents: data.discountCents,
        totalCents: data.totalCents,
      });
    } catch (e) {
      setQuoteError(String(e));
    }
  }, [
    cart,
    fulfillmentType,
    paymentMethod,
    name,
    phone,
    email,
    line1,
    neighborhood,
    deliveryZoneId,
    couponCode,
  ]);

  useEffect(() => {
    const t = setTimeout(() => void refreshQuote(), 300);
    return () => clearTimeout(t);
  }, [refreshQuote]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!cart?.branchId || !cart.items.length) {
      setError("Sepet boş");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const body = {
        branchId: cart.branchId,
        fulfillmentType,
        paymentMethod,
        contact: { name, phone, email: email || undefined },
        deliveryAddress:
          fulfillmentType === FulfillmentType.DELIVERY
            ? {
                line1,
                city: "İstanbul",
                ...(neighborhood.trim()
                  ? { neighborhood: neighborhood.trim() }
                  : {}),
              }
            : undefined,
        deliveryZoneId:
          fulfillmentType === FulfillmentType.DELIVERY
            ? deliveryZoneId
            : undefined,
        couponCode: couponCode || undefined,
        items: toCheckoutItems(cart),
      };
      const res = await fetch(`${getApiUrl()}/api/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(localizeApiError(data.error ?? JSON.stringify(data)));
        return;
      }
      clearCart();
      if (
        paymentMethod === PaymentMethod.IYZICO_ONLINE &&
        data.iyzico?.paymentPageUrl
      ) {
        window.location.href = data.iyzico.paymentPageUrl as string;
        return;
      }
      router.push(`/track/${data.order.orderNo ?? data.order.trackingToken}`);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  const paymentOptions =
    fulfillmentType === FulfillmentType.DELIVERY
      ? [
          { value: PaymentMethod.IYZICO_ONLINE, label: "Online" },
          { value: PaymentMethod.CASH_ON_DELIVERY, label: "Kapıda nakit" },
          { value: PaymentMethod.CARD_ON_DELIVERY, label: "Kapıda kart" },
        ]
      : [
          { value: PaymentMethod.IYZICO_ONLINE, label: "Online" },
          { value: PaymentMethod.PAY_AT_STORE, label: "Kasada" },
        ];

  const orderSummary = cart?.items.length ? (
    <div className={styles.summaryCard}>
      <div className={styles.summaryHead}>
        <h2>Sipariş özeti</h2>
        <Link href={menuHref} className={styles.editLink}>
          Düzenle
        </Link>
      </div>
      <ul className={styles.cartLines}>
        {cart.items.map((item, idx) => {
          const summary = formatOptionSummary(item.optionLabels);
          const desc = item.productDescription?.trim() || "";
          const open = openIdx === idx;
          const lineTotal =
            item.unitPriceCents != null
              ? item.unitPriceCents * item.quantity
              : null;
          return (
            <li key={`${item.productId}-${idx}`}>
              <button
                type="button"
                className={styles.lineBtn}
                onClick={() => setOpenIdx(open ? null : idx)}
                aria-expanded={open}
              >
                <span className={styles.lineMain}>
                  <span className={styles.lineTitle}>
                    {item.quantity}× {item.productName ?? "Ürün"}
                  </span>
                  {summary ? (
                    <span className={styles.lineMeta}>{summary}</span>
                  ) : desc ? (
                    <span className={styles.lineMeta}>{desc}</span>
                  ) : null}
                </span>
                <span className={styles.lineRight}>
                  {lineTotal != null ? (
                    <em>{formatTryLabel(lineTotal)}</em>
                  ) : null}
                  <span className={styles.lineChevron} aria-hidden>
                    {open ? "−" : "+"}
                  </span>
                </span>
              </button>
              {open ? (
                <div className={styles.lineDetails}>
                  {desc ? <p>{desc}</p> : null}
                  {summary ? <p>Seçimler: {summary}</p> : null}
                  {item.note ? <p>Not: {item.note}</p> : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {quote ? (
        <div className={styles.totals}>
          <div>
            <span>Ara toplam</span>
            <span>{formatTryLabel(quote.subtotalCents)}</span>
          </div>
          <div>
            <span>Teslimat</span>
            <span>{formatTryLabel(quote.deliveryFeeCents)}</span>
          </div>
          {quote.discountCents > 0 ? (
            <div>
              <span>İndirim</span>
              <span>−{formatTryLabel(quote.discountCents)}</span>
            </div>
          ) : null}
          <div className={styles.grand}>
            <span>Toplam</span>
            <span>{formatTryLabel(quote.totalCents)}</span>
          </div>
        </div>
      ) : null}
      {quoteError ? <p className={styles.error}>{quoteError}</p> : null}
    </div>
  ) : null;

  return (
    <main className={styles.page}>
      <div className={styles.atmosphere} aria-hidden />

      <header className={styles.top}>
        <BrandMark href={menuHref} size={36} />
        <ThemeToggle />
      </header>

      {!cart?.items.length ? (
        <div className={styles.empty}>
          <h1>Ödeme</h1>
          <p className={styles.hint}>
            Sepet boş.{" "}
            <Link href={menuHref}>Menüden ürün ekleyin</Link>.
          </p>
        </div>
      ) : (
        <form className={styles.layout} onSubmit={submit}>
          <div className={styles.mainCol}>
            <header className={styles.hero}>
              <p className={styles.eyebrow}>Son adım</p>
              <h1>Ödeme</h1>
              <p className={styles.sub}>
                Bilgilerini gir, mangaldan sofrana gelsin.
              </p>
            </header>

            <div className={styles.mobileSummary}>{orderSummary}</div>

            <section className={styles.block} aria-labelledby="contact-h">
              <h2 id="contact-h">İletişim</h2>
              <div className={styles.fields}>
                <label>
                  Ad
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                </label>
                <label>
                  Telefon
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05xx xxx xx xx"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                  />
                </label>
                <label>
                  {onlinePayment ? "E-posta" : "E-posta (opsiyonel)"}
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required={onlinePayment}
                  />
                </label>
              </div>
            </section>

            <section className={styles.block} aria-labelledby="fulfill-h">
              <h2 id="fulfill-h">Teslimat</h2>
              <div
                className={styles.seg}
                role="group"
                aria-label="Teslimat tipi"
              >
                <button
                  type="button"
                  className={
                    fulfillmentType === FulfillmentType.DELIVERY
                      ? styles.segOn
                      : undefined
                  }
                  onClick={() => setFulfillmentType(FulfillmentType.DELIVERY)}
                >
                  Kurye
                </button>
                <button
                  type="button"
                  className={
                    fulfillmentType === FulfillmentType.PICKUP
                      ? styles.segOn
                      : undefined
                  }
                  onClick={() => setFulfillmentType(FulfillmentType.PICKUP)}
                >
                  Gel-Al
                </button>
              </div>

              {fulfillmentType === FulfillmentType.DELIVERY ? (
                <div className={styles.fields}>
                  <label>
                    Adres
                    <input
                      value={line1}
                      onChange={(e) => setLine1(e.target.value)}
                      placeholder="Sokak, bina, daire"
                      required
                    />
                  </label>
                  <label>
                    Teslimat bölgesi
                    <select
                      value={deliveryZoneId}
                      onChange={(e) => setDeliveryZoneId(e.target.value)}
                      required
                      disabled={!zones.length}
                    >
                      {!zones.length ? (
                        <option value="">Bölge yükleniyor / yok</option>
                      ) : null}
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.name} (+{formatTryLabel(z.feeCents)})
                        </option>
                      ))}
                    </select>
                  </label>
                  {zonesError ? (
                    <p className={styles.error}>
                      {zonesError}{" "}
                      <button
                        type="button"
                        className={styles.linkBtn}
                        onClick={() => {
                          clearCart();
                          setCart(null);
                          router.push("/");
                        }}
                      >
                        Sepeti temizle
                      </button>
                    </p>
                  ) : null}
                  {zoneNeighborhoods.length > 0 ? (
                    <label>
                      Mahalle
                      <select
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        required
                      >
                        <option value="">Seçin</option>
                        {zoneNeighborhoods.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>
              ) : (
                <p className={styles.pickupNote}>
                  Sipariş hazır olunca şubeden teslim alırsın.
                </p>
              )}
            </section>

            <section className={styles.block} aria-labelledby="pay-h">
              <h2 id="pay-h">Ödeme</h2>
              <div className={styles.segWrap} role="group" aria-label="Ödeme">
                {paymentOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={
                      paymentMethod === opt.value ? styles.segOn : undefined
                    }
                    onClick={() => setPaymentMethod(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <label className={styles.coupon}>
                Kupon
                <input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="HOSGELDIN10"
                />
              </label>
            </section>

            {error ? <p className={styles.error}>{error}</p> : null}

            <div className={styles.mobileCta}>
              <button
                type="submit"
                className={styles.submit}
                disabled={loading || !quote}
              >
                {loading
                  ? "Gönderiliyor…"
                  : quote
                    ? `Siparişi oluştur · ${formatTryLabel(quote.totalCents)}`
                    : "Siparişi oluştur"}
              </button>
            </div>
          </div>

          <aside className={styles.sideCol}>
            {orderSummary}
            <button
              type="submit"
              className={styles.submit}
              disabled={loading || !quote}
            >
              {loading
                ? "Gönderiliyor…"
                : quote
                  ? `Siparişi oluştur · ${formatTryLabel(quote.totalCents)}`
                  : "Siparişi oluştur"}
            </button>
          </aside>
        </form>
      )}
    </main>
  );
}
