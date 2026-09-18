export const CART_STORAGE_KEY = "silakebap.cart";

export type CartLine = {
  productId: string;
  quantity: number;
  optionItemIds: string[];
  note?: string;
  /** display helpers (optional, not sent to API) */
  productName?: string;
  productDescription?: string;
  optionLabels?: string[];
  unitPriceCents?: number;
  imageSlug?: string;
  imageUrl?: string | null;
};

export type Cart = {
  branchId: string;
  items: CartLine[];
};

export function readCart(): Cart | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Cart;
  } catch {
    return null;
  }
}

export function writeCart(cart: Cart): void {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event("silakebap:cart"));
}

export function clearCart(): void {
  localStorage.removeItem(CART_STORAGE_KEY);
  window.dispatchEvent(new Event("silakebap:cart"));
}

export function addToCart(branchId: string, line: CartLine): Cart {
  const existing = readCart();
  let cart: Cart;
  if (!existing || existing.branchId !== branchId) {
    cart = { branchId, items: [line] };
  } else {
    const sameIdx = existing.items.findIndex(
      (i) =>
        i.productId === line.productId &&
        [...i.optionItemIds].sort().join() ===
          [...line.optionItemIds].sort().join(),
    );
    if (sameIdx >= 0) {
      const items = [...existing.items];
      const prev = items[sameIdx]!;
      items[sameIdx] = {
        ...prev,
        quantity: prev.quantity + line.quantity,
        optionLabels: line.optionLabels ?? prev.optionLabels,
        productDescription: line.productDescription ?? prev.productDescription,
        unitPriceCents: line.unitPriceCents ?? prev.unitPriceCents,
        imageSlug: line.imageSlug ?? prev.imageSlug,
        imageUrl: line.imageUrl ?? prev.imageUrl,
      };
      cart = { branchId, items };
    } else {
      cart = { branchId, items: [...existing.items, line] };
    }
  }
  writeCart(cart);
  return cart;
}

export function setLineQuantity(index: number, quantity: number): Cart | null {
  const cart = readCart();
  if (!cart) return null;
  if (quantity <= 0) {
    const items = cart.items.filter((_, i) => i !== index);
    if (!items.length) {
      clearCart();
      return null;
    }
    const next = { ...cart, items };
    writeCart(next);
    return next;
  }
  const items = cart.items.map((item, i) =>
    i === index ? { ...item, quantity } : item,
  );
  const next = { ...cart, items };
  writeCart(next);
  return next;
}

export function removeLine(index: number): Cart | null {
  return setLineQuantity(index, 0);
}

export function cartItemCount(cart: Cart | null): number {
  if (!cart) return 0;
  return cart.items.reduce((n, i) => n + i.quantity, 0);
}

export function cartSubtotalCents(cart: Cart | null): number {
  if (!cart) return 0;
  return cart.items.reduce(
    (sum, i) => sum + (i.unitPriceCents ?? 0) * i.quantity,
    0,
  );
}

export function formatOptionSummary(labels?: string[]): string {
  if (!labels?.length) return "";
  return labels.join(", ");
}

export function toCheckoutItems(cart: Cart) {
  return cart.items.map(({ productId, quantity, optionItemIds, note }) => ({
    productId,
    quantity,
    optionItemIds,
    note,
  }));
}
