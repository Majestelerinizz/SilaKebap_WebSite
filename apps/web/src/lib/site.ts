/** Site SEO / mutlak URL’ler — prod’da WEB_ORIGIN veya NEXT_PUBLIC_SITE_URL */
export const SITE = {
  name: "Sıla Kebap",
  url: (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.WEB_ORIGIN ||
    "https://62.171.146.132.nip.io"
  ).replace(/\/$/, ""),
  description:
    "Sıla Kebap — mangaldan sofrana. Online sipariş, kurye veya gel-al. Adana kebap, dürüm, lahmacun ve tatlılar.",
  ogImage: "/brand/hero.jpg",
  phone: "+905551112233",
  locale: "tr_TR",
} as const;
