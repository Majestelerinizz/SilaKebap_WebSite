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

type Zone = { id: string; name: string; feeCents: number; neighborhoods: string[] };

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
  const [couponCode, setCouponCode] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  useEffect(() => {
    const sync = () => setCart(readCart());
    sync();
    window.addEventListener("silakebap:cart", sync);
    return () => window.removeEventListener("silakebap:cart", sync);
  }, []);

  useEffect(() => {
    if (!cart?.branchId) return;
    void (async () => {
      const res = await fetch(`${getApiUrl()}/api/catalog/branches/${cart.branchId}`);
      const data = await res.json();
      if (!res.ok) return;
      const list = (data.branch.deliveryZones ?? []) as Zone[];
      setZones(list);
      if (list[0] && !deliveryZoneId) setDeliveryZoneId(list[0].id);
    })();
  }, [cart?.branchId, deliveryZoneId]);

  useEffect(() => {
    setNeighborhood("");
  }, [deliveryZoneId]);

  const selectedZone = zones.find((z) => z.id === deliveryZoneId);
  const zoneNeighborhoods = selectedZone?.neighborhoods ?? [];
  const onlinePayment = paymentMethod === PaymentMethod.IYZICO_ONLINE;

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

  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <BrandMark href="/cart" size={36} />
        <ThemeToggle />
      </header>
      <h1>Ödeme</h1>

      {!cart?.items.length ? (
        <p className={styles.hint}>
          Sepet boş. <Link href="/">Menüden ürün ekleyin</Link>.
        </p>
      ) : (
        <>
          <ul className={styles.cartLines}>
            {cart.items.map((item, idx) => {
              const summary = formatOptionSummary(item.optionLabels);
              const desc = item.productDescription?.trim() || "";
              const open = openIdx === idx;
              return (
                <li key={`${item.productId}-${idx}`}>
                  <button
                    type="button"
                    className={styles.lineBtn}
                    onClick={() => setOpenIdx(open ? null : idx)}
                    aria-expanded={open}
                  >
                    <span className={styles.lineTitle}>
                      {item.quantity}× {item.productName ?? item.productId}
                    </span>
                    <span className={styles.lineChevron}>{open ? "−" : "+"}</span>
                  </button>
                  {desc ? (
                    <p className={styles.lineOptions}>{desc}</p>
                  ) : null}
                  {summary ? (
                    <p className={styles.lineOptions}>
                      Seçimler: {summary}
                    </p>
                  ) : null}
                  {!desc && !summary ? (
                    <p className={styles.lineOptionsMuted}>Detay yok</p>
                  ) : null}
                  {open ? (
                    <div className={styles.lineDetails}>
                      {desc ? (
                        <p>
                          İçindekiler: <strong>{desc}</strong>
                        </p>
                      ) : null}
                      {summary ? (
                        <p>
                          Seçimler: <strong>{summary}</strong>
                        </p>
                      ) : null}
                      {item.unitPriceCents != null ? (
                        <p>
                          Birim: {formatTryLabel(item.unitPriceCents)} · Satır:{" "}
                          {formatTryLabel(
                            (item.unitPriceCents ?? 0) * item.quantity,
                          )}
                        </p>
                      ) : null}
                      {item.note ? <p>Not: {item.note}</p> : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <form className={styles.form} onSubmit={submit}>
            <label>
              Ad
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label>
              Telefon
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="05xx xxx xx xx"
                required
              />
            </label>
            <label>
              {onlinePayment ? "E-posta" : "E-posta (opsiyonel)"}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required={onlinePayment}
              />
            </label>
            <label>
              Teslimat tipi
              <select
                value={fulfillmentType}
                onChange={(e) => setFulfillmentType(e.target.value)}
              >
                <option value={FulfillmentType.DELIVERY}>Kurye</option>
                <option value={FulfillmentType.PICKUP}>Gel-Al</option>
              </select>
            </label>
            <label>
              Ödeme
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value={PaymentMethod.IYZICO_ONLINE}>iyzico online</option>
                {fulfillmentType === FulfillmentType.DELIVERY ? (
                  <>
                    <option value={PaymentMethod.CASH_ON_DELIVERY}>
                      Kapıda nakit
                    </option>
                    <option value={PaymentMethod.CARD_ON_DELIVERY}>
                      Kapıda kart
                    </option>
                  </>
                ) : (
                  <option value={PaymentMethod.PAY_AT_STORE}>Kasada</option>
                )}
              </select>
            </label>
            {fulfillmentType === FulfillmentType.DELIVERY ? (
              <>
                <label>
                  Adres
                  <input
                    value={line1}
                    onChange={(e) => setLine1(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Teslimat bölgesi
                  <select
                    value={deliveryZoneId}
                    onChange={(e) => setDeliveryZoneId(e.target.value)}
                    required
                  >
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} (+{formatTryLabel(z.feeCents)})
                      </option>
                    ))}
                  </select>
                </label>
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
              </>
            ) : null}
            <label>
              Kupon
              <input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="HOSGELDIN10"
              />
            </label>

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
                    <span>-{formatTryLabel(quote.discountCents)}</span>
                  </div>
                ) : null}
                <div className={styles.grand}>
                  <span>Toplam</span>
                  <span>{formatTryLabel(quote.totalCents)}</span>
                </div>
              </div>
            ) : null}
            {quoteError ? <p className={styles.error}>{quoteError}</p> : null}
            {error ? <p className={styles.error}>{error}</p> : null}

            <button type="submit" disabled={loading || !quote}>
              {loading ? "Gönderiliyor…" : "Siparişi oluştur"}
            </button>
          </form>
        </>
      )}
    </main>
  );
}
