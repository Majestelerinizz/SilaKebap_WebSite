import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient, StaffRole, OptionGroupType, CouponType } from "@prisma/client";
import bcrypt from "bcryptjs";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), ".env"));
loadEnvFile(resolve(process.cwd(), "../../.env"));

function requireSeedPassword(name: string): string {
  const value = process.env[name]?.trim() ?? "";
  if (value.length < 10) {
    throw new Error(`${name} must be set to at least 10 characters before seeding`);
  }
  return value;
}

const prisma = new PrismaClient();

const standardKebapSizeGroup = {
  name: "Porsiyon",
  type: OptionGroupType.SIZE,
  minSelect: 1,
  maxSelect: 1,
  isRequired: true,
  sortOrder: 1,
  items: {
    create: [
      { name: "Tek", priceDeltaCents: 0, isDefault: true, sortOrder: 1 },
      { name: "1.5", priceDeltaCents: 8000, sortOrder: 2 },
      { name: "Duble", priceDeltaCents: 14000, sortOrder: 3 },
    ],
  },
};

const urfaKebapSizeGroup = {
  name: "Porsiyon",
  type: OptionGroupType.SIZE,
  minSelect: 1,
  maxSelect: 1,
  isRequired: true,
  sortOrder: 1,
  items: {
    create: [
      { name: "Tek", priceDeltaCents: 0, isDefault: true, sortOrder: 1 },
      { name: "Duble", priceDeltaCents: 14000, sortOrder: 2 },
    ],
  },
};

const optionalDurumSizeGroup = {
  name: "Porsiyon",
  type: OptionGroupType.SIZE,
  minSelect: 0,
  maxSelect: 1,
  isRequired: false,
  sortOrder: 1,
  items: {
    create: [
      { name: "Normal", priceDeltaCents: 0, isDefault: true, sortOrder: 1 },
      { name: "Duble et", priceDeltaCents: 6000, sortOrder: 2 },
    ],
  },
};

async function main() {
  await prisma.orderStatusHistory.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItemOption.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.branchProduct.deleteMany();
  await prisma.optionItem.deleteMany();
  await prisma.optionGroup.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.deliveryZone.deleteMany();
  await prisma.workingHours.deleteMany();
  await prisma.staffMembership.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.media.deleteMany();

  const branch = await prisma.branch.create({
    data: {
      name: "Sıla Kebap Merkez",
      slug: "merkez",
      phone: "+905551112233",
      addressLine1: "Örnek Mah. Kebap Cad. No:1",
      city: "İstanbul",
      district: "Kadıköy",
      timezone: "Europe/Istanbul",
      isOpen: true,
      minOrderCents: 15000,
    },
  });

  const neighborhoods = ["Caferağa", "Moda", "Osmanağa", "Rasimpaşa"];
  const zone = await prisma.deliveryZone.create({
    data: {
      branchId: branch.id,
      name: "Kadıköy Merkez",
      neighborhoods,
      feeCents: 4000,
      minOrderCents: 15000,
      isActive: true,
    },
  });

  for (let day = 0; day <= 6; day++) {
    await prisma.workingHours.create({
      data: {
        branchId: branch.id,
        dayOfWeek: day,
        openTime: "11:00",
        closeTime: "23:00",
        isClosed: day === 1 ? false : false,
      },
    });
  }

  const passwordHash = await bcrypt.hash(requireSeedPassword("SEED_ADMIN_PASSWORD"), 10);
  const admin = await prisma.user.create({
    data: {
      email: "admin@silakebap.local",
      name: "Süper Admin",
      phone: "+905550000001",
      passwordHash,
      isSuperAdmin: true,
    },
  });

  const kitchen = await prisma.user.create({
    data: {
      email: "mutfak@silakebap.local",
      name: "Mutfak",
      phone: "+905550000002",
      passwordHash: await bcrypt.hash(requireSeedPassword("SEED_KITCHEN_PASSWORD"), 10),
    },
  });

  const courier = await prisma.user.create({
    data: {
      email: "kurye@silakebap.local",
      name: "Kurye",
      phone: "+905550000003",
      passwordHash: await bcrypt.hash(requireSeedPassword("SEED_COURIER_PASSWORD"), 10),
    },
  });

  await prisma.staffMembership.createMany({
    data: [
      { userId: kitchen.id, branchId: branch.id, role: StaffRole.KITCHEN },
      { userId: courier.id, branchId: branch.id, role: StaffRole.COURIER },
    ],
  });

  const kebapCat = await prisma.category.create({
    data: {
      name: "Kebaplar",
      slug: "kebaplar",
      description: "Izgara kebap çeşitleri",
      sortOrder: 1,
    },
  });

  const durumCat = await prisma.category.create({
    data: {
      name: "Dürümler",
      slug: "durumler",
      description: "Lavaş dürüm çeşitleri",
      sortOrder: 2,
    },
  });

  const lahmacunPideCat = await prisma.category.create({
    data: {
      name: "Lahmacun & Pide",
      slug: "lahmacun-pide",
      description: "Fırın ürünleri",
      sortOrder: 3,
    },
  });

  const tatliCat = await prisma.category.create({
    data: {
      name: "Tatlılar",
      slug: "tatlilar",
      description: "Geleneksel tatlılar",
      sortOrder: 4,
    },
  });

  const icecekCat = await prisma.category.create({
    data: {
      name: "İçecekler",
      slug: "icecekler",
      description: "Soğuk içecekler",
      sortOrder: 5,
    },
  });

  type SeededProduct = { id: string; slug: string; basePriceCents: number };
  const seededProducts: SeededProduct[] = [];

  const adana = await prisma.product.create({
    data: {
      categoryId: kebapCat.id,
      name: "Adana Kebap",
      slug: "adana-kebap",
      description: "Acılı kıyma kebap, pilav ve salata ile",
      basePriceCents: 32000,
      sortOrder: 1,
      optionGroups: {
        create: [
          standardKebapSizeGroup,
          {
            name: "Ekstralar",
            type: OptionGroupType.EXTRA,
            minSelect: 0,
            maxSelect: 5,
            isRequired: false,
            sortOrder: 2,
            items: {
              create: [
                { name: "Extra acı", priceDeltaCents: 0, sortOrder: 1 },
                { name: "Extra soğan", priceDeltaCents: 0, sortOrder: 2 },
                { name: "Peynir", priceDeltaCents: 2500, sortOrder: 3 },
              ],
            },
          },
          {
            name: "Çıkarılabilir",
            type: OptionGroupType.REMOVABLE,
            minSelect: 0,
            maxSelect: 3,
            isRequired: false,
            sortOrder: 3,
            items: {
              create: [
                { name: "Soğansız", priceDeltaCents: 0, sortOrder: 1 },
                { name: "Maydanozsuz", priceDeltaCents: 0, sortOrder: 2 },
              ],
            },
          },
        ],
      },
    },
  });
  seededProducts.push({
    id: adana.id,
    slug: adana.slug,
    basePriceCents: adana.basePriceCents,
  });

  const urfa = await prisma.product.create({
    data: {
      categoryId: kebapCat.id,
      name: "Urfa Kebap",
      slug: "urfa-kebap",
      description: "Acısız kıyma kebap, pilav ve salata ile",
      basePriceCents: 32000,
      sortOrder: 2,
      optionGroups: {
        create: [urfaKebapSizeGroup],
      },
    },
  });
  seededProducts.push({
    id: urfa.id,
    slug: urfa.slug,
    basePriceCents: urfa.basePriceCents,
  });

  const beyti = await prisma.product.create({
    data: {
      categoryId: kebapCat.id,
      name: "Beyti Kebap",
      slug: "beyti-kebap",
      description: "Lavaşa sarılı kıyma kebap, yoğurt ve domates sos ile",
      basePriceCents: 38000,
      sortOrder: 3,
      optionGroups: {
        create: [standardKebapSizeGroup],
      },
    },
  });
  seededProducts.push({
    id: beyti.id,
    slug: beyti.slug,
    basePriceCents: beyti.basePriceCents,
  });

  const tavukSis = await prisma.product.create({
    data: {
      categoryId: kebapCat.id,
      name: "Tavuk Şiş",
      slug: "tavuk-sis",
      description: "Marine tavuk şiş, pilav ve salata ile",
      basePriceCents: 28000,
      sortOrder: 4,
      optionGroups: {
        create: [standardKebapSizeGroup],
      },
    },
  });
  seededProducts.push({
    id: tavukSis.id,
    slug: tavukSis.slug,
    basePriceCents: tavukSis.basePriceCents,
  });

  const adanaDurum = await prisma.product.create({
    data: {
      categoryId: durumCat.id,
      name: "Adana Dürüm",
      slug: "adana-durum",
      description: "Acılı kıyma kebap, lavaş içinde",
      basePriceCents: 24000,
      sortOrder: 1,
    },
  });
  seededProducts.push({
    id: adanaDurum.id,
    slug: adanaDurum.slug,
    basePriceCents: adanaDurum.basePriceCents,
  });

  const urfaDurum = await prisma.product.create({
    data: {
      categoryId: durumCat.id,
      name: "Urfa Dürüm",
      slug: "urfa-durum",
      description: "Acısız kıyma kebap, lavaş içinde",
      basePriceCents: 24000,
      sortOrder: 2,
      optionGroups: {
        create: [optionalDurumSizeGroup],
      },
    },
  });
  seededProducts.push({
    id: urfaDurum.id,
    slug: urfaDurum.slug,
    basePriceCents: urfaDurum.basePriceCents,
  });

  const lahmacun = await prisma.product.create({
    data: {
      categoryId: lahmacunPideCat.id,
      name: "Lahmacun",
      slug: "lahmacun",
      description: "İnce hamur, bol kıyma",
      basePriceCents: 9000,
      sortOrder: 1,
    },
  });
  seededProducts.push({
    id: lahmacun.id,
    slug: lahmacun.slug,
    basePriceCents: lahmacun.basePriceCents,
  });

  const kiymaliPide = await prisma.product.create({
    data: {
      categoryId: lahmacunPideCat.id,
      name: "Kıymalı Pide",
      slug: "kiymali-pide",
      description: "Kaşarlı kıymalı pide",
      basePriceCents: 18000,
      sortOrder: 2,
    },
  });
  seededProducts.push({
    id: kiymaliPide.id,
    slug: kiymaliPide.slug,
    basePriceCents: kiymaliPide.basePriceCents,
  });

  const kunefe = await prisma.product.create({
    data: {
      categoryId: tatliCat.id,
      name: "Künefe",
      slug: "kunefe",
      description: "Sıcak künefe, kaymak ile",
      basePriceCents: 15000,
      sortOrder: 1,
    },
  });
  seededProducts.push({
    id: kunefe.id,
    slug: kunefe.slug,
    basePriceCents: kunefe.basePriceCents,
  });

  const baklava = await prisma.product.create({
    data: {
      categoryId: tatliCat.id,
      name: "Baklava",
      slug: "baklava",
      description: "Antep fıstıklı baklava (3 dilim)",
      basePriceCents: 12000,
      sortOrder: 2,
    },
  });
  seededProducts.push({
    id: baklava.id,
    slug: baklava.slug,
    basePriceCents: baklava.basePriceCents,
  });

  const ayran = await prisma.product.create({
    data: {
      categoryId: icecekCat.id,
      name: "Ayran",
      slug: "ayran",
      description: "Ev yapımı ayran",
      basePriceCents: 4000,
      sortOrder: 1,
    },
  });
  seededProducts.push({
    id: ayran.id,
    slug: ayran.slug,
    basePriceCents: ayran.basePriceCents,
  });

  const salgam = await prisma.product.create({
    data: {
      categoryId: icecekCat.id,
      name: "Şalgam",
      slug: "salgam",
      description: "Acılı veya acısız şalgam suyu",
      basePriceCents: 3500,
      sortOrder: 2,
    },
  });
  seededProducts.push({
    id: salgam.id,
    slug: salgam.slug,
    basePriceCents: salgam.basePriceCents,
  });

  const kola = await prisma.product.create({
    data: {
      categoryId: icecekCat.id,
      name: "Kola",
      slug: "kola",
      description: "330 ml kutu",
      basePriceCents: 5000,
      sortOrder: 3,
    },
  });
  seededProducts.push({
    id: kola.id,
    slug: kola.slug,
    basePriceCents: kola.basePriceCents,
  });

  await prisma.branchProduct.createMany({
    data: seededProducts.map((p) => ({
      branchId: branch.id,
      productId: p.id,
      priceCents: p.basePriceCents,
      isAvailable: true,
      isVisible: true,
    })),
  });

  await prisma.coupon.create({
    data: {
      code: "HOSGELDIN10",
      type: CouponType.PERCENT,
      value: 10,
      branchId: branch.id,
      minOrderCents: 20000,
      isActive: true,
    },
  });

  const productSlugs = seededProducts.map((p) => p.slug);

  console.log("Seed OK");
  console.log({
    branchId: branch.id,
    branchSlug: branch.slug,
    deliveryZoneId: zone.id,
    adminEmail: admin.email,
    kitchenEmail: kitchen.email,
    courierEmail: courier.email,
    productSlugs,
  });
  console.log("Product slugs:", productSlugs.join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
