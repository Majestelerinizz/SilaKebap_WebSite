import { SITE } from "@/lib/site";

export function JsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: SITE.name,
    description: SITE.description,
    url: SITE.url,
    telephone: SITE.phone,
    image: `${SITE.url}${SITE.ogImage}`,
    servesCuisine: ["Turkish", "Kebab"],
    priceRange: "₺₺",
    acceptsReservations: false,
    hasMenu: `${SITE.url}/`,
    potentialAction: {
      "@type": "OrderAction",
      target: `${SITE.url}/`,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
