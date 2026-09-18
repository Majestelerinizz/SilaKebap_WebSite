import { OrderStatus, PaymentMethod, FulfillmentType } from "./enums.js";

export const ORDER_STATUS_TR: Record<string, string> = {
  [OrderStatus.PENDING_PAYMENT]: "Ödeme bekleniyor",
  [OrderStatus.RECEIVED]: "Sipariş alındı",
  [OrderStatus.PREPARING]: "Hazırlanıyor",
  [OrderStatus.READY]: "Hazır",
  [OrderStatus.COURIER_ASSIGNED]: "Kurye atandı",
  [OrderStatus.ON_THE_WAY]: "Yolda",
  [OrderStatus.AWAITING_PICKUP]: "Gel-al bekleniyor",
  [OrderStatus.DELIVERED]: "Teslim edildi",
  [OrderStatus.CANCELLED]: "İptal",
};

export const PAYMENT_METHOD_TR: Record<string, string> = {
  [PaymentMethod.IYZICO_ONLINE]: "Online (iyzico)",
  [PaymentMethod.CASH_ON_DELIVERY]: "Kapıda nakit",
  [PaymentMethod.CARD_ON_DELIVERY]: "Kapıda kart",
  [PaymentMethod.PAY_AT_STORE]: "Kasada",
};

export const FULFILLMENT_TR: Record<string, string> = {
  [FulfillmentType.DELIVERY]: "Kurye",
  [FulfillmentType.PICKUP]: "Gel-Al",
};

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_TR[status] ?? status;
}

export function paymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_TR[method] ?? method;
}

export function fulfillmentLabel(type: string): string {
  return FULFILLMENT_TR[type] ?? type;
}

/** Delivery timeline steps (excluding cancelled / pending payment). */
export const DELIVERY_STEPS = [
  OrderStatus.RECEIVED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.COURIER_ASSIGNED,
  OrderStatus.ON_THE_WAY,
  OrderStatus.DELIVERED,
] as const;

export const PICKUP_STEPS = [
  OrderStatus.RECEIVED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.AWAITING_PICKUP,
  OrderStatus.DELIVERED,
] as const;
