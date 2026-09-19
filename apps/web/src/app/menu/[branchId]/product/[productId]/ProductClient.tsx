"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatTryLabel } from "@silakebap/shared";
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

const STEP_META: Array<{ id: StepId; label: string }> = [
  { id: "size", label: "Porsiyon" },
  { id: "extra", label: "Ekstralar" },
  { id: "remove", label: "Çıkarılabilir" },
  { id: "cart", label: "Sepete" },
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

function stepDomId(id: StepId) {
  return `step-${id}`;
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
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");

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
      } catch (e) {
        setError(String(e));
      }
    })();
  }, [branchId, productId]);

  const sections = useMemo(() => {
    if (!product) return [] as Array<{ id: StepId; label: string }>;
    return STEP_META.filter((s) => {
      if (s.id === "cart") return true;
      return groupsForStep(product.optionGroups, s.id).length > 0;
    });
  }, [product]);

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

  function validate(): string | null {
    if (!product) return "Ürün yok";
    if (!product.isAvailable) return "Ürün müsait değil";
    for (const g of product.optionGroups) {
      const n = (selected[g.id] ?? []).length;
      if (g.isRequired && n < Math.max(1, g.minSelect)) {
        return `${g.name} seçimi zorunlu`;
      }
      if (n < g.minSelect) return `${g.name}: en az ${g.minSelect} seçim`;
      if (n > g.maxSelect) return `${g.name}: en fazla ${g.maxSelect} seçim`;
    }
    return null;
  }

  function scrollToSection(id: StepId) {
    const el = document.getElementById(stepDomId(id));
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 24;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  }

  function onAdd() {
    const err = validate();
    if (err || !product) {
      setError(err ?? "Hata");
      if (err && product) {
        for (const s of sections) {
          if (s.id === "cart") continue;
          const groups = groupsForStep(product.optionGroups, s.id);
          for (const g of groups) {
            const n = (selected[g.id] ?? []).length;
            if (g.isRequired && n < Math.max(1, g.minSelect)) {
              scrollToSection(s.id);
              return;
            }
          }
        }
      }
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
    router.push(`/menu/${branchId}`);
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

  const summaryBits = product.optionGroups
    .flatMap((g) =>
      (selected[g.id] ?? [])
        .map((id) => g.items.find((i) => i.id === id)?.name)
        .filter(Boolean),
    )
    .slice(0, 6);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href={`/menu/${branchId}`}>← Menü</Link>
        <div className={styles.headerActions}>
          <ThemeToggle />
        </div>
      </header>

      <div className={styles.heroWrap}>
        <SafeImage
          src={resolveProductImage(product.slug, product.imageUrl)}
          fallbackSrc={productImageFallback()}
          alt={product.name}
          fill
          sizes="(max-width: 959px) 100vw, 48vw"
          className={styles.heroImg}
          priority
        />
      </div>

      <div className={styles.config}>
        <h1 className={styles.title}>{product.name}</h1>
        {product.description ? (
          <p className={styles.desc}>{product.description}</p>
        ) : null}
        <p className={styles.price}>{formatTryLabel(unitCents)}</p>

        <div className={styles.elevator}>
          {sections
            .filter((s) => s.id !== "cart")
            .map((s) => {
              const groups = groupsForStep(product.optionGroups, s.id);
              return (
                <section
                  key={s.id}
                  id={stepDomId(s.id)}
                  className={styles.block}
                >
                  <h2 className={styles.blockTitle}>{s.label}</h2>
                  <div className={styles.groups}>
                    {groups.map((g) => (
                      <div key={g.id} className={styles.group}>
                        <div className={styles.groupHead}>
                          <span>
                            {g.name}
                            {g.isRequired ? " *" : ""}
                          </span>
                        </div>
                        <ul className={styles.options}>
                          {g.items.map((item) => {
                            const checked = (selected[g.id] ?? []).includes(
                              item.id,
                            );
                            return (
                              <li key={item.id}>
                                <label className={styles.option}>
                                  <input
                                    type={
                                      g.maxSelect <= 1 ? "radio" : "checkbox"
                                    }
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
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}

          <section id={stepDomId("cart")} className={styles.block}>
            <h2 className={styles.blockTitle}>Sepete</h2>
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
                aria-label="Azalt"
              >
                −
              </button>
              <span>{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(99, q + 1))}
                aria-label="Artır"
              >
                +
              </button>
            </div>
          </section>
        </div>

        {error ? <p className={styles.error}>{error}</p> : null}

        <div className={styles.stickyBar}>
          <button
            type="button"
            className={styles.addBtn}
            disabled={!product.isAvailable}
            onClick={onAdd}
          >
            Sepete ekle — {formatTryLabel(unitCents * qty)}
          </button>
        </div>
      </div>
    </main>
  );
}
