export const OrderStatus = {
  PENDING_PAYMENT: "PENDING_PAYMENT",
  RECEIVED: "RECEIVED",
  PREPARING: "PREPARING",
  READY: "READY",
  COURIER_ASSIGNED: "COURIER_ASSIGNED",
  ON_THE_WAY: "ON_THE_WAY",
  AWAITING_PICKUP: "AWAITING_PICKUP",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const PaymentMethod = {
  IYZICO_ONLINE: "IYZICO_ONLINE",
  CASH_ON_DELIVERY: "CASH_ON_DELIVERY",
  CARD_ON_DELIVERY: "CARD_ON_DELIVERY",
  PAY_AT_STORE: "PAY_AT_STORE",
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PaymentStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
  UNPAID: "UNPAID",
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const FulfillmentType = {
  DELIVERY: "DELIVERY",
  PICKUP: "PICKUP",
} as const;

export type FulfillmentType = (typeof FulfillmentType)[keyof typeof FulfillmentType];

export const StaffRole = {
  SUPER_ADMIN: "SUPER_ADMIN",
  KITCHEN: "KITCHEN",
  COURIER: "COURIER",
} as const;

export type StaffRole = (typeof StaffRole)[keyof typeof StaffRole];

export const CouponType = {
  PERCENT: "PERCENT",
  FIXED: "FIXED",
} as const;

export type CouponType = (typeof CouponType)[keyof typeof CouponType];

export const OptionGroupType = {
  SIZE: "SIZE",
  EXTRA: "EXTRA",
  REMOVABLE: "REMOVABLE",
  COMBO: "COMBO",
  SINGLE: "SINGLE",
  MULTI: "MULTI",
} as const;

export type OptionGroupType = (typeof OptionGroupType)[keyof typeof OptionGroupType];
