import type { StaffUser } from "@/lib/auth";

export type NavItem = {
  href: string;
  label: string;
  short: string;
};

export function adminNavFor(staff: StaffUser | null): NavItem[] {
  if (!staff) return [];

  if (staff.isSuperAdmin) {
    return [
      { href: "/dashboard", label: "Özet", short: "Özet" },
      { href: "/orders", label: "Siparişler", short: "Sipariş" },
      { href: "/products", label: "Ürünler", short: "Ürün" },
      { href: "/zones", label: "Bölgeler", short: "Bölge" },
      { href: "/coupons", label: "Kuponlar", short: "Kupon" },
      { href: "/integrations", label: "Entegrasyon", short: "API" },
      { href: "/kitchen", label: "Mutfak", short: "Mutfak" },
      { href: "/courier", label: "Kurye", short: "Kurye" },
    ];
  }

  const roles = new Set(staff.memberships.map((m) => m.role));
  const links: NavItem[] = [];
  if (roles.has("KITCHEN")) {
    links.push({ href: "/kitchen", label: "Mutfak", short: "Mutfak" });
  }
  if (roles.has("COURIER")) {
    links.push({ href: "/courier", label: "Kurye", short: "Kurye" });
  }
  return links;
}
