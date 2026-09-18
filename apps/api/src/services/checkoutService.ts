import { randomBytes } from "node:crypto";
import {
  CouponType,
  FulfillmentType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  prisma,
} from "@silakebap/database";
import {
  checkoutSchema,
  type CheckoutInput,
} from "@silakebap/shared";
import { HttpError } from "../middleware/errorHandler.js";

export type PricedCheckout = {
  input: CheckoutInput;
  subtotalCents: number;
  deliveryFeeCents: number;
  discountCents: number;
  totalCents: number;
  couponId: string | null;
  lines: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
    note?: string;
    options: Array<{
      optionItemId: string;
      name: string;
      priceDeltaCents: number;
    }>;
  }>;
};

function trackingToken(): string {
  return randomBytes(24).toString("hex");
}

export async function priceCheckout(input: CheckoutInput): Promise<PricedCheckout> {
  const branch = await prisma.branch.findUnique({ where: { id: input.branchId } });
  if (!branch) throw new HttpError(404, "Branch not found");
  if (!branch.isOpen) throw new HttpError(400, "Branch is closed");

  let deliveryFeeCents = 0;
  let zoneMinOrder: number | null = null;

  if (input.fulfillmentType === FulfillmentType.DELIVERY) {
    if (!input.deliveryZoneId) {
      throw new HttpError(400, "deliveryZoneId is required for DELIVERY");
    }
    const zone = await prisma.deliveryZone.findFirst({
      where: {
        id: input.deliveryZoneId,
        branchId: input.branchId,
        isActive: true,
      },
    });
    if (!zone) throw new HttpError(400, "Invalid delivery zone");
    deliveryFeeCents = zone.feeCents;
    zoneMinOrder = zone.minOrderCents;
  }

  const lines: PricedCheckout["lines"] = [];

  for (const item of input.items) {
    const bp = await prisma.branchProduct.findUnique({
      where: {
        branchId_productId: {
          branchId: input.branchId,
          productId: item.productId,
        },
      },
      include: {
        product: {
          include: {
            optionGroups: { include: { items: true } },
          },
        },
      },
    });

    if (!bp || !bp.isVisible || !bp.isAvailable || !bp.product.isActive) {
      throw new HttpError(400, `Product unavailable: ${item.productId}`);
    }

    const optionById = new Map(
      bp.product.optionGroups.flatMap((g) =>
        g.items.map((oi) => [oi.id, { group: g, item: oi }] as const),
      ),
    );

    const selectedOptions: PricedCheckout["lines"][number]["options"] = [];
    let optionsCents = 0;

    for (const optionItemId of item.optionItemIds) {
      const found = optionById.get(optionItemId);
      if (!found || !found.item.isActive) {
        throw new HttpError(400, `Invalid option: ${optionItemId}`);
      }
      optionsCents += found.item.priceDeltaCents;
      selectedOptions.push({
        optionItemId: found.item.id,
        name: found.item.name,
        priceDeltaCents: found.item.priceDeltaCents,
      });
    }

    for (const group of bp.product.optionGroups) {
      const selectedInGroup = item.optionItemIds.filter((id) =>
        group.items.some((oi) => oi.id === id),
      ).length;
      if (group.isRequired && selectedInGroup < group.minSelect) {
        throw new HttpError(400, `Option group required: ${group.name}`);
      }
      if (selectedInGroup > group.maxSelect) {
        throw new HttpError(400, `Too many options in: ${group.name}`);
      }
    }

    const unitPriceCents = bp.priceCents + optionsCents;
    const lineTotalCents = unitPriceCents * item.quantity;
    lines.push({
      productId: bp.productId,
      productName: bp.product.name,
      quantity: item.quantity,
      unitPriceCents,
      lineTotalCents,
      note: item.note,
      options: selectedOptions,
    });
  }

  const subtotalCents = lines.reduce((sum, l) => sum + l.lineTotalCents, 0);
  const minOrder = zoneMinOrder ?? branch.minOrderCents;
  if (subtotalCents < minOrder) {
    throw new HttpError(400, `Minimum order is ${minOrder} kuruş`);
  }

  let discountCents = 0;
  let couponId: string | null = null;

  if (input.couponCode) {
    const coupon = await prisma.coupon.findFirst({
      where: {
        code: input.couponCode.toUpperCase(),
        isActive: true,
        OR: [{ branchId: null }, { branchId: input.branchId }],
      },
    });
    if (!coupon) throw new HttpError(400, "Invalid coupon");
    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) {
      throw new HttpError(400, "Coupon not started");
    }
    if (coupon.endsAt && coupon.endsAt < now) {
      throw new HttpError(400, "Coupon expired");
    }
    if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
      throw new HttpError(400, "Coupon usage limit reached");
    }
    if (subtotalCents < coupon.minOrderCents) {
      throw new HttpError(400, "Order below coupon minimum");
    }
    discountCents =
      coupon.type === CouponType.PERCENT
        ? Math.floor((subtotalCents * coupon.value) / 100)
        : coupon.value;
    discountCents = Math.min(discountCents, subtotalCents);
    couponId = coupon.id;
  }

  const totalCents = Math.max(0, subtotalCents + deliveryFeeCents - discountCents);

  return {
    input,
    subtotalCents,
    deliveryFeeCents,
    discountCents,
    totalCents,
    couponId,
    lines,
  };
}

export async function createOrderFromCheckout(priced: PricedCheckout) {
  const { input } = priced;
  const isOnline = input.paymentMethod === PaymentMethod.IYZICO_ONLINE;
  const initialStatus = isOnline
    ? OrderStatus.PENDING_PAYMENT
    : OrderStatus.RECEIVED;
  const paymentStatus = isOnline ? PaymentStatus.PENDING : PaymentStatus.UNPAID;

  const order = await prisma.$transaction(
    async (tx) => {
      const created = await tx.order.create({
        data: {
          branchId: input.branchId,
          fulfillmentType: input.fulfillmentType,
          status: initialStatus,
          paymentMethod: input.paymentMethod,
          paymentStatus,
          guestName: input.contact.name,
          guestPhone: input.contact.phone,
          guestEmail: input.contact.email || null,
          deliveryZoneId: input.deliveryZoneId ?? null,
          addressSnapshot: input.deliveryAddress
            ? (input.deliveryAddress as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          subtotalCents: priced.subtotalCents,
          deliveryFeeCents: priced.deliveryFeeCents,
          discountCents: priced.discountCents,
          totalCents: priced.totalCents,
          couponId: priced.couponId,
          trackingToken: trackingToken(),
          items: {
            create: priced.lines.map((line) => ({
              productId: line.productId,
              productName: line.productName,
              unitPriceCents: line.unitPriceCents,
              quantity: line.quantity,
              lineTotalCents: line.lineTotalCents,
              note: line.note,
              options: {
                create: line.options.map((o) => ({
                  optionItemId: o.optionItemId,
                  name: o.name,
                  priceDeltaCents: o.priceDeltaCents,
                })),
              },
            })),
          },
          payments: {
            create: {
              method: input.paymentMethod,
              status: paymentStatus,
              amountCents: priced.totalCents,
              provider: isOnline ? "iyzico" : null,
            },
          },
          statusHistory: {
            create: {
              fromStatus: null,
              toStatus: initialStatus,
              note: "Order created",
            },
          },
        },
        include: {
          items: { include: { options: true } },
          payments: true,
        },
      });

      if (priced.couponId) {
        await tx.coupon.update({
          where: { id: priced.couponId },
          data: { usedCount: { increment: 1 } },
        });
      }

      return created;
    },
    {
      // Neon (özellikle cold start) için varsayılan 5s yetmiyor
      maxWait: 15_000,
      timeout: 30_000,
    },
  );
  return order;
}

export function parseCheckoutBody(body: unknown): CheckoutInput {
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    throw new HttpError(400, "Invalid checkout payload", parsed.error.flatten());
  }
  return parsed.data;
}
