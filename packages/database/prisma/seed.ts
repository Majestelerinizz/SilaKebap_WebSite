import { PrismaClient, StaffRole, OptionGroupType, CouponType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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

  // Seed passwords meet API policy (min 10). Change immediately on any shared/prod DB.
  const passwordHash = await bcrypt.hash("Admin1234!", 10);
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
      passwordHash: await bcrypt.hash("Kitchen123!", 10),
    },
  });

  const courier = await prisma.user.create({
    data: {
      email: "kurye@silakebap.local",
      name: "Kurye",
      phone: "+905550000003",
      passwordHash: await bcrypt.hash("Courier123!", 10),
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

  const icecekCat = await prisma.category.create({
    data: {
      name: "İçecekler",
      slug: "icecekler",
      sortOrder: 2,
    },
  });

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
          {
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
          },
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
    include: { optionGroups: { include: { items: true } } },
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

  const urfa = await prisma.product.create({
    data: {
      categoryId: kebapCat.id,
      name: "Urfa Kebap",
      slug: "urfa-kebap",
      description: "Acısız kıyma kebap",
      basePriceCents: 32000,
      sortOrder: 2,
      optionGroups: {
        create: [
          {
            name: "Porsiyon",
            type: OptionGroupType.SIZE,
            minSelect: 1,
            maxSelect: 1,
            isRequired: true,
            items: {
              create: [
                { name: "Tek", priceDeltaCents: 0, isDefault: true, sortOrder: 1 },
                { name: "Duble", priceDeltaCents: 14000, sortOrder: 2 },
              ],
            },
          },
        ],
      },
    },
  });

  const lahmacunCat = await prisma.category.create({
    data: {
      name: "Lahmacun & Pide",
      slug: "lahmacun-pide",
      sortOrder: 3,
    },
  });

  const lahmacun = await prisma.product.create({
    data: {
      categoryId: lahmacunCat.id,
      name: "Lahmacun",
      slug: "lahmacun",
      description: "İnce hamur, bol kıyma",
      basePriceCents: 9000,
      sortOrder: 1,
    },
  });

  await prisma.branchProduct.createMany({
    data: [
      {
        branchId: branch.id,
        productId: adana.id,
        priceCents: 32000,
        isAvailable: true,
        isVisible: true,
      },
      {
        branchId: branch.id,
        productId: urfa.id,
        priceCents: 32000,
        isAvailable: true,
        isVisible: true,
      },
      {
        branchId: branch.id,
        productId: lahmacun.id,
        priceCents: 9000,
        isAvailable: true,
        isVisible: true,
      },
      {
        branchId: branch.id,
        productId: ayran.id,
        priceCents: 4000,
        isAvailable: true,
        isVisible: true,
      },
    ],
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

  console.log("Seed OK");
  console.log({
    branchId: branch.id,
    branchSlug: branch.slug,
    deliveryZoneId: zone.id,
    adminEmail: admin.email,
    kitchenEmail: kitchen.email,
    courierEmail: courier.email,
    products: [adana.slug, urfa.slug, lahmacun.slug, ayran.slug],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
