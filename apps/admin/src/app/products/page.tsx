"use client";

import { useEffect, useState } from "react";
import { formatTryLabel } from "@silakebap/shared";
import { AdminShell } from "@/components/AdminShell";
import {
  apiFetch,
  apiUrl,
  resolveActiveBranchId,
} from "@/lib/auth";
import styles from "../adminForms.module.css";

type Category = { id: string; name: string };
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
  description: string | null;
  basePriceCents: number;
  isActive: boolean;
  imageKey: string | null;
  category: Category;
  optionGroups: OptionGroup[];
  branchProducts: Array<{
    branchId: string;
    priceCents: number;
    isAvailable: boolean;
    isVisible: boolean;
  }>;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [branchId, setBranchId] = useState("");
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("100");
  const [catName, setCatName] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  // option group form
  const [ogName, setOgName] = useState("Porsiyon");
  const [ogType, setOgType] = useState("SIZE");
  const [ogRequired, setOgRequired] = useState(true);
  const [ogItems, setOgItems] = useState("Tek|0|1\nDuble|140|0");

  async function load() {
    const [pRes, cRes] = await Promise.all([
      apiFetch(`${apiUrl}/api/admin/products`),
      apiFetch(`${apiUrl}/api/admin/categories`),
    ]);
    const pData = await pRes.json();
    const cData = await cRes.json();
    if (!pRes.ok) {
      setError(pData.error ?? "Ürünler yüklenemedi (SUPER_ADMIN gerekir)");
      return;
    }
    setError("");
    setProducts(pData.products ?? []);
    setCategories(cData.categories ?? []);
    if (cData.categories?.[0] && !categoryId) {
      setCategoryId(cData.categories[0].id);
    }
  }

  useEffect(() => {
    void (async () => {
      const bid = await resolveActiveBranchId();
      setBranchId(bid);
      void load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    const res = await apiFetch(`${apiUrl}/api/admin/categories`, {
      method: "POST",
      body: JSON.stringify({ name: catName }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Kategori eklenemedi");
      return;
    }
    setCatName("");
    setMsg("Kategori eklendi");
    void load();
  }

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    const cents = Math.round(Number(price) * 100);
    const res = await apiFetch(`${apiUrl}/api/admin/products`, {
      method: "POST",
      body: JSON.stringify({
        categoryId,
        name,
        basePriceCents: cents,
        branchId: branchId || undefined,
        branchPriceCents: cents,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Ürün eklenemedi");
      return;
    }
    setName("");
    setMsg(`Ürün eklendi: ${data.product.name}`);
    setExpandedId(data.product.id);
    void load();
  }

  async function saveBranchProduct(
    p: Product,
    patch: Partial<{
      priceCents: number;
      isAvailable: boolean;
      isVisible: boolean;
    }>,
  ) {
    if (!branchId) {
      setError("Şube seçili değil — dashboard’dan şube seçin");
      return;
    }
    const existing = p.branchProducts.find((b) => b.branchId === branchId);
    const res = await apiFetch(`${apiUrl}/api/admin/branch-products`, {
      method: "PUT",
      body: JSON.stringify({
        branchId,
        productId: p.id,
        priceCents: patch.priceCents ?? existing?.priceCents ?? p.basePriceCents,
        isAvailable: patch.isAvailable ?? existing?.isAvailable ?? true,
        isVisible: patch.isVisible ?? existing?.isVisible ?? true,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Şube ürünü güncellenemedi");
      return;
    }
    setMsg("Şube fiyatı / durum güncellendi");
    void load();
  }

  async function addOptionGroup(productId: string) {
    const items = ogItems
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [n, delta, def] = line.split("|").map((s) => s.trim());
        return {
          name: n || "Seçenek",
          priceDeltaCents: Math.round(Number(delta || 0) * 100),
          isDefault: def === "1",
        };
      });

    const res = await apiFetch(
      `${apiUrl}/api/admin/products/${productId}/option-groups`,
      {
        method: "POST",
        body: JSON.stringify({
          name: ogName,
          type: ogType,
          minSelect: ogRequired ? 1 : 0,
          maxSelect: ogType === "EXTRA" || ogType === "REMOVABLE" || ogType === "MULTI" ? 5 : 1,
          isRequired: ogRequired,
          items,
        }),
      },
    );
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Seçenek grubu eklenemedi");
      return;
    }
    setMsg(`Seçenek grubu eklendi: ${ogName}`);
    void load();
  }

  async function uploadProductImage(productId: string, file: File) {
    setError("");
    setMsg("");
    const prep = await apiFetch(
      `${apiUrl}/api/admin/products/${productId}/image-upload`,
      {
        method: "POST",
        body: JSON.stringify({ contentType: file.type || "image/jpeg" }),
      },
    );
    const prepData = await prep.json();
    if (!prep.ok) {
      setError(prepData.error ?? "Yükleme URL alınamadı (R2 yapılandırıldı mı?)");
      return;
    }

    const put = await fetch(prepData.uploadUrl as string, {
      method: "PUT",
      headers: { "Content-Type": file.type || "image/jpeg" },
      body: file,
    });
    if (!put.ok) {
      setError("R2’ye yükleme başarısız");
      return;
    }

    const save = await apiFetch(`${apiUrl}/api/admin/products/${productId}`, {
      method: "PATCH",
      body: JSON.stringify({ imageKey: prepData.key }),
    });
    if (!save.ok) {
      const data = await save.json();
      setError(data.error ?? "imageKey kaydedilemedi");
      return;
    }
    setMsg("Görsel yüklendi");
    void load();
  }

  return (
    <AdminShell
      title="Ürünler"
      subtitle={`Aktif şube: ${branchId || "—"}`}
    >
      {error ? <p className={styles.error}>{error}</p> : null}
      {msg ? <p className={styles.ok}>{msg}</p> : null}

      <form className={styles.form} onSubmit={createCategory}>
        <h2>Kategori ekle</h2>
        <input
          value={catName}
          onChange={(e) => setCatName(e.target.value)}
          placeholder="Kategori adı"
          required
        />
        <button type="submit">Ekle</button>
      </form>

      <form className={styles.form} onSubmit={createProduct}>
        <h2>Ürün ekle</h2>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ürün adı"
          required
        />
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Şube fiyatı TL"
          required
        />
        <button type="submit">Ekle + şubeye bağla</button>
      </form>

      <ul className={styles.list}>
        {products.map((p) => {
          const bp = p.branchProducts.find((b) => b.branchId === branchId);
          const open = expandedId === p.id;
          return (
            <li key={p.id} className={styles.cardCol}>
              <div className={styles.cardRow}>
                <button
                  type="button"
                  className={styles.linkish}
                  onClick={() => setExpandedId(open ? null : p.id)}
                >
                  <strong>{p.name}</strong>
                  <span>
                    {p.category.name} ·{" "}
                    {formatTryLabel(bp?.priceCents ?? p.basePriceCents)}
                    {bp ? "" : " (şubede yok)"}
                  </span>
                </button>
                <div className={styles.rowActions}>
                  <button
                    type="button"
                    onClick={() =>
                      saveBranchProduct(p, {
                        isAvailable: !(bp?.isAvailable ?? true),
                      })
                    }
                  >
                    {bp?.isAvailable === false ? "Müsait" : "Durdur"}
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() =>
                      saveBranchProduct(p, {
                        isVisible: !(bp?.isVisible ?? true),
                      })
                    }
                  >
                    {bp?.isVisible === false ? "Göster" : "Gizle"}
                  </button>
                </div>
              </div>

              {open ? (
                <div className={styles.expand}>
                  <label>
                    Ürün görseli
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadProductImage(p.id, file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {p.imageKey ? (
                    <p className={styles.hint}>Kayıtlı: {p.imageKey}</p>
                  ) : (
                    <p className={styles.hint}>Henüz görsel yok</p>
                  )}

                  <label>
                    Şube fiyatı (TL)
                    <input
                      type="number"
                      step="0.01"
                      defaultValue={(
                        (bp?.priceCents ?? p.basePriceCents) / 100
                      ).toFixed(2)}
                      onBlur={(e) => {
                        const cents = Math.round(Number(e.target.value) * 100);
                        if (!Number.isFinite(cents)) return;
                        void saveBranchProduct(p, { priceCents: cents });
                      }}
                    />
                  </label>

                  <div>
                    <h3>Seçenek grupları</h3>
                    {p.optionGroups.length === 0 ? (
                      <p className={styles.hint}>Henüz yok</p>
                    ) : (
                      <ul className={styles.nested}>
                        {p.optionGroups.map((g) => (
                          <li key={g.id}>
                            <strong>
                              {g.name} ({g.type})
                            </strong>
                            <span>
                              {g.items
                                .map(
                                  (i) =>
                                    `${i.name}${i.priceDeltaCents ? ` +${formatTryLabel(i.priceDeltaCents)}` : ""}`,
                                )
                                .join(", ")}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className={styles.form}>
                    <h3>Seçenek grubu ekle</h3>
                    <input
                      value={ogName}
                      onChange={(e) => setOgName(e.target.value)}
                      placeholder="Grup adı"
                    />
                    <select
                      value={ogType}
                      onChange={(e) => setOgType(e.target.value)}
                    >
                      <option value="SIZE">SIZE (boy)</option>
                      <option value="EXTRA">EXTRA</option>
                      <option value="REMOVABLE">REMOVABLE</option>
                      <option value="COMBO">COMBO</option>
                      <option value="SINGLE">SINGLE</option>
                      <option value="MULTI">MULTI</option>
                    </select>
                    <label className={styles.check}>
                      <input
                        type="checkbox"
                        checked={ogRequired}
                        onChange={(e) => setOgRequired(e.target.checked)}
                      />
                      Zorunlu
                    </label>
                    <textarea
                      value={ogItems}
                      onChange={(e) => setOgItems(e.target.value)}
                      rows={4}
                      placeholder={"ad|fiyatTL|varsayılan(1/0)\nTek|0|1"}
                    />
                    <button type="button" onClick={() => addOptionGroup(p.id)}>
                      Grubu kaydet
                    </button>
                  </div>

                  {branchId ? (
                    <p className={styles.hint}>
                      Müşteri linki:{" "}
                      <a
                        href={`http://localhost:3000/menu/${branchId}/product/${p.id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        /menu/.../product/{p.id}
                      </a>
                    </p>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </AdminShell>
  );
}
