const DEFAULT_PRODUCT = "/menu/products/adana-kebap.jpg";
const DEFAULT_CATEGORY = "/menu/categories/kebaplar.jpg";

const CATEGORY_ALIASES: Record<string, string> = {
  kebaplar: "/menu/categories/kebaplar.jpg",
  icecekler: "/menu/categories/icecekler.jpg",
  "lahmacun-pide": "/menu/categories/lahmacun-pide.jpg",
  lahmacun: "/menu/categories/lahmacun-pide.jpg",
  pide: "/menu/categories/lahmacun-pide.jpg",
  durumler: "/menu/categories/durumler.jpg",
  durum: "/menu/categories/durumler.jpg",
  tatlilar: "/menu/categories/tatlilar.jpg",
  tatli: "/menu/categories/tatlilar.jpg",
};

const PRODUCT_FILES = {
  adana: "/menu/products/adana-kebap.jpg",
  urfa: "/menu/products/urfa-kebap.jpg",
  lahmacun: "/menu/products/lahmacun.jpg",
  ayran: "/menu/products/ayran.jpg",
} as const;

function pickProductFile(slug: string): string {
  if (slug.includes("lahmacun") || slug.includes("pide")) {
    return PRODUCT_FILES.lahmacun;
  }
  if (
    slug.includes("ayran") ||
    slug.includes("salgam") ||
    slug.includes("kola") ||
    slug.includes("gazoz") ||
    slug.includes("su") ||
    slug.includes("cay") ||
    slug.includes("icecek")
  ) {
    return PRODUCT_FILES.ayran;
  }
  if (
    slug.includes("kunefe") ||
    slug.includes("baklava") ||
    slug.includes("sutlac") ||
    slug.includes("tatli")
  ) {
    return PRODUCT_FILES.ayran;
  }
  if (slug.includes("urfa")) return PRODUCT_FILES.urfa;
  if (
    slug.includes("adana") ||
    slug.includes("kebap") ||
    slug.includes("sis") ||
    slug.includes("durum") ||
    slug.includes("kofte") ||
    slug.includes("beyti") ||
    slug.includes("tavuk") ||
    slug.includes("patlican") ||
    slug.includes("izgara")
  ) {
    return PRODUCT_FILES.adana;
  }
  return DEFAULT_PRODUCT;
}

export function resolveProductImage(
  slug?: string | null,
  imageUrl?: string | null,
): string {
  if (imageUrl) return imageUrl;
  if (!slug) return DEFAULT_PRODUCT;
  return pickProductFile(slug);
}

export function resolveCategoryImage(slug?: string | null): string {
  if (!slug) return DEFAULT_CATEGORY;
  if (CATEGORY_ALIASES[slug]) return CATEGORY_ALIASES[slug];
  const key = Object.keys(CATEGORY_ALIASES).find((k) => slug.includes(k));
  if (key && CATEGORY_ALIASES[key]) return CATEGORY_ALIASES[key];
  return DEFAULT_CATEGORY;
}

export function productImageFallback() {
  return DEFAULT_PRODUCT;
}

export function categoryImageFallback() {
  return DEFAULT_CATEGORY;
}

export const BRAND = {
  logo: "/brand/silakebap_logo.jpg",
  hero: "/brand/hero.jpg",
} as const;
