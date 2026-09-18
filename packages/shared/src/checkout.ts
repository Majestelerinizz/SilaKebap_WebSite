import { z } from "zod";
import { FulfillmentType, PaymentMethod } from "./enums.js";

const trPhone = z
  .string()
  .min(10)
  .max(20)
  .refine((v) => /^(\+90|0)?5\d{9}$/.test(v.replace(/[\s\-()]/g, "")), {
    message: "Geçerli bir Türkiye cep telefonu girin",
  });

export const guestContactSchema = z.object({
  name: z.string().min(2).max(120),
  phone: trPhone,
  email: z.string().email().optional().or(z.literal("")),
});

export const cartLineSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.number().int().min(1).max(99),
  optionItemIds: z.array(z.string().cuid()).default([]),
  note: z.string().max(500).optional(),
});

export const checkoutSchema = z
  .object({
    branchId: z.string().cuid(),
    fulfillmentType: z.enum([
      FulfillmentType.DELIVERY,
      FulfillmentType.PICKUP,
    ]),
    paymentMethod: z.enum([
      PaymentMethod.IYZICO_ONLINE,
      PaymentMethod.CASH_ON_DELIVERY,
      PaymentMethod.CARD_ON_DELIVERY,
      PaymentMethod.PAY_AT_STORE,
    ]),
    contact: guestContactSchema,
    deliveryAddress: z
      .object({
        line1: z.string().min(5).max(300),
        line2: z.string().max(300).optional(),
        district: z.string().max(120).optional(),
        city: z.string().max(120).optional(),
        neighborhood: z.string().max(120).optional(),
        notes: z.string().max(500).optional(),
      })
      .optional(),
    deliveryZoneId: z.string().cuid().optional(),
    couponCode: z.string().max(64).optional(),
    items: z.array(cartLineSchema).min(1),
  })
  .superRefine((data, ctx) => {
    if (data.paymentMethod === PaymentMethod.IYZICO_ONLINE) {
      if (!data.contact.email || data.contact.email.length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Online ödeme için e-posta zorunlu",
          path: ["contact", "email"],
        });
      }
    }
    if (data.fulfillmentType === FulfillmentType.DELIVERY) {
      if (!data.deliveryAddress) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Delivery address is required for DELIVERY",
          path: ["deliveryAddress"],
        });
      }
      if (data.paymentMethod === PaymentMethod.PAY_AT_STORE) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "PAY_AT_STORE is only valid for PICKUP",
          path: ["paymentMethod"],
        });
      }
    }
    if (data.fulfillmentType === FulfillmentType.PICKUP) {
      if (
        data.paymentMethod === PaymentMethod.CASH_ON_DELIVERY ||
        data.paymentMethod === PaymentMethod.CARD_ON_DELIVERY
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "COD methods are only valid for DELIVERY",
          path: ["paymentMethod"],
        });
      }
    }
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;
