"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatTryLabel } from "@silakebap/shared";
import { CartBadge } from "@/components/CartBadge";
import { SafeImage } from "@/components/SafeImage";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getApiUrl } from "@/lib/api";
import { addToCart } from "@/lib/cart";
import { productImageFallback, resolveProductImage } from "@/lib/media";
import styles from "./product.module.css";

type OptionItem = {
  id: string;
  name: string;
  priceDeltaCents: number;
  isDefault: boolean;
};

type OptionGroup = {
  id: string;
  name: string;
  type: string;
  minSelect: number;
  maxSelect: number;
  isRequired: boolean;
  items: OptionItem[];
};

type Product = {
  id: string;
  name: string;
  slug?: string;
  description: string | null;
  priceCents: number;
  isAvailable: boolean;
  imageUrl?: string | null;
  optionGroups: OptionGroup[];
};

type StepId = "size" | "extra" | "remove" | "cart";

const STEP_META: Array<{ id: StepId; label: string; types: string[] }> = [
  { id: "size", label: "Boy", types: ["SIZE", "SINGLE"] },
  { id: "extra", label: "Ekstra", types: ["EXTRA", "MULTI", "COMBO"] },
  { id: "remove", label: "Çıkar", types: ["REMOVABLE"] },
  { id: "cart", label: "Sepete", types: [] },
];

function groupsForStep(groups: OptionGroup[], stepId: StepId) {
  if (stepId === "cart") return [];
  if (stepId === "size") {
    return groups.filter((g) => g.type === "SIZE" || g.type === "SINGLE");
  }
  if (stepId === "remove") {
    return groups.filter((g) => g.type === "REMOVABLE");
  }
  return groups.filter(
    (g) =>
      g.type === "EXTRA" ||
      g.type === "MULTI" ||
      g.type === "COMBO" ||
      (g.type !== "SIZE" && g.type !== "SINGLE" && g.type !== "REMOVABLE"),
  );
}

export default function ProductClient({
  branchId,
  productId,
}: {
  branchId: string;
  productId: string;
}) {
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(
          `${getApiUrl()}/api/catalog/branches/${branchId}/products/${productId}`,
        );
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Ürün yüklenemedi");
          return;
        }
        const p = data.product as Product;
        setProduct(p);
        const defaults: Record<string, string[]> = {};
        for (const g of p.optionGroups) {
          const def = g.items.filter((i) => i.isDefault).map((i) => i.id);
          if (def.length) defaults[g.id] = def;
          else if (g.isRequired && g.items[0]) defaults[g.id] = [g.items[0].id];
          else defaults[g.id] = [];
        }
        setSelected(defaults);
        const first = p.optionGroups.find((g) => g.isRequired) ?? p.optionGroups[0];
        setOpenGroupId(first?.id ?? null);
      } catch (e) {
        setError(String(e));
      }
    })();
  }, [branchId, productId]);

  const steps = useMemo(() => {
    if (!product) return STEP_META.filter((s) => s.id === "cart");
    const withGroups = STEP_META.filter((s) => {
      if (s.id === "cart") return true;
      return groupsForStep(product.optionGroups, s.id).length > 0;
    });
    return withGroups.length ? withGroups : STEP_META.filter((s) => s.id === "cart");
  }, [product]);

  const activeStep = steps[Math.min(stepIndex, steps.length - 1)];
  const stepGroups =
    product && activeStep
      ? groupsForStep(product.optionGroups, activeStep.id)
      : [];

  useEffect(() => {
    if (!product || !activeStep || activeStep.id === "cart") return;
    const groups = groupsForStep(product.optionGroups, activeStep.id);
    const preferred = groups.find((g) => g.isRequired) ?? groups[0] ?? null;
    setOpenGroupId(preferred?.id ?? null);
  }, [activeStep, product]);

  const unitCents = useMemo(() => {
    if (!product) return 0;
    let extras = 0;
    for (const g of product.optionGroups) {
      for (const id of selected[g.id] ?? []) {
        const item = g.items.find((i) => i.id === id);
        if (item) extras += item.priceDeltaCents;
      }
    }
    return product.priceCents + extras;
  }, [product, selected]);

  function toggleOption(group: OptionGroup, itemId: string) {
    setSelected((prev) => {
      const current = prev[group.id] ?? [];
      if (group.maxSelect <= 1) {
        return { ...prev, [group.id]: [itemId] };
      }
      if (current.includes(itemId)) {
        return {
          ...prev,
          [group.id]: current.filter((id) => id !== itemId),
        };
      }
      if (current.length >= group.maxSelect) return prev;
      return { ...prev, [group.id]: [...current, itemId] };
    });
  }

  function validateGroups(groups: OptionGroup[]): string | null {
    for (const g of groups) {
      const n = (selected[g.id] ?? []).length;
      if (g.isRequired && n < Math.max(1, g.minSelect)) {
        return `${g.name} seçimi zorunlu`;
      }
      if (n < g.minSelect) return `${g.name}: en az ${g.minSelect} seçim`;
      if (n > g.maxSelect) return `${g.name}: en fazla ${g.maxSelect} seçim`;
    }
    return null;
  }

  function validate(): string | null {
    if (!product) return "Ürün yok";
    if (!product.isAvailable) return "Ürün müsait değil";
    return validateGroups(product.optionGroups);
  }

  function onNext() {
    const err = validateGroups(stepGroups);
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  function onBack() {
    setError("");
    setStepIndex((i) => Math.max(0, i - 1));
  }

  function onAdd() {
    const err = validate();
    if (err || !product) {
      setError(err ?? "Hata");
      return;
    }
    const optionItemIds = product.optionGroups.flatMap(
      (g) => selected[g.id] ?? [],
    );
    const optionLabels = product.optionGroups.flatMap((g) =>
      (selected[g.id] ?? [])
        .map((id) => g.items.find((i) => i.id === id)?.name)
        .filter((n): n is string => Boolean(n)),
    );
    addToCart(branchId, {
      productId: product.id,
      quantity: qty,
      optionItemIds,
      note: note || undefined,
      productName: product.name,
      productDescription: product.description ?? undefined,
      optionLabels,
      unitPriceCents: unitCents,
      imageSlug: product.slug,
      imageUrl: product.imageUrl,
    });
    router.push("/cart");
  }

  if (error && !product) {
    return (
      <main className={styles.page}>
        <p>{error}</p>
        <Link href={`/menu/${branchId}`}>Menüye dön</Link>
      </main>
    );
  }

  if (!product) {
    return (
      <main className={styles.page}>
        <p>Yükleniyor…</p>
      </main>
    );
  }

  const isLast = activeStep?.id === "cart";
  const summaryBits = product.optionGroups
    .flatMap((g) =>
      (selected[g.id] ?? [])
        .map((id) => g.items.find((i) => i.id === id)?.name)
        .filter(Boolean),
    )
    .slice(0, 4);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href={`/menu/${branchId}`}>← Menü</Link>
        <div className={styles.headerActions}>
          <ThemeToggle />
          <CartBadge />
        </div>
      </header>

      <div className={styles.heroWrap}>
        <SafeImage
          src={resolveProductImage(product.slug, product.imageUrl)}
          fallbackSrc={productImageFallback()}
          alt={product.name}
          fill
          sizes="(max-width: 560px) 100vw, 560px"
          className={styles.heroImg}
          priority
        />
      </div>

      <h1 className={styles.title}>{product.name}</h1>
      {product.description ? (
        <p className={styles.desc}>{product.description}</p>
      ) : null}
      <p className={styles.price}>{formatTryLabel(unitCents)}</p>

      <ol
        className={styles.steps}
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
        aria-label="Seçim adımları"
      >        {steps.map((s, i) => (
          <li
            key={s.id}
            className={`${styles.step} ${i === stepIndex ? styles.stepActive : ""} ${i < stepIndex ? styles.stepDone : ""}`}
          >
            <span className={styles.stepNum}>{i + 1}</span>
            <span>{s.label}</span>
          </li>
        ))}
      </ol>

      {!isLast ? (
        <div className={styles.groups}>
          {stepGroups.map((g) => {
            const open = openGroupId === g.id;
            return (
              <section key={g.id} className={styles.group}>
                <button
                  type="button"
                  className={styles.groupToggle}
                  onClick={() => setOpenGroupId(open ? null : g.id)}
                >
                  <span>
                    {g.name}
                    {g.isRequired ? " *" : ""}
                  </span>
                  <span>{open ? "−" : "+"}</span>
                </button>
                {open ? (
                  <ul className={styles.options}>
                    {g.items.map((item) => {
                      const checked = (selected[g.id] ?? []).includes(item.id);
                      return (
                        <li key={item.id}>
                          <label className={styles.option}>
                            <input
                              type={g.maxSelect <= 1 ? "radio" : "checkbox"}
                              name={g.id}
                              checked={checked}
                              onChange={() => toggleOption(g, item.id)}
                            />
                            <span>{item.name}</span>
                            {item.priceDeltaCents !== 0 ? (
                              <em>
                                {item.priceDeltaCents > 0 ? "+" : ""}
                                {formatTryLabel(item.priceDeltaCents)}
                              </em>
                            ) : null}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : (
        <>
          {summaryBits.length ? (
            <p className={styles.summary}>
              Seçimler: {summaryBits.join(" · ")}
            </p>
          ) : null}
          <label className={styles.note}>
            Not
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="İsteğe bağlı"
            />
          </label>
          <div className={styles.qtyRow}>
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
            >
              −
            </button>
            <span>{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(99, q + 1))}
            >
              +
            </button>
          </div>
        </>
      )}

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.stickyBar}>
        {stepIndex > 0 ? (
          <button type="button" className={styles.backBtn} onClick={onBack}>
            Geri
          </button>
        ) : (
          <span />
        )}
        {!isLast ? (
          <button type="button" className={styles.addBtn} onClick={onNext}>
            Devam — {formatTryLabel(unitCents)}
          </button>
        ) : (
          <button
            type="button"
            className={styles.addBtn}
            disabled={!product.isAvailable}
            onClick={onAdd}
          >
            Sepete ekle — {formatTryLabel(unitCents * qty)}
          </button>
        )}
      </div>
    </main>
  );
}
