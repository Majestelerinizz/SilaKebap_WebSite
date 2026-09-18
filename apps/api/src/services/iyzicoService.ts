import { env } from "../config/env.js";
import type { Order, OrderItem, OrderItemOption } from "@silakebap/database";
import { HttpError } from "../middleware/errorHandler.js";
import Iyzipay from "iyzipay";

type OrderWithItems = Order & {
  items: Array<OrderItem & { options: OrderItemOption[] }>;
  payments?: Array<{ id: string }>;
};

type IyzicoStartResult = {
  paymentPageUrl?: string;
  token?: string;
  mode: "live" | "sandbox-stub";
};

/**
 * Starts iyzico Checkout Form. Without API keys, returns a stub URL for local dev.
 */
export async function startIyzicoPayment(
  order: OrderWithItems,
): Promise<IyzicoStartResult> {
  if (!env.IYZICO_API_KEY || !env.IYZICO_SECRET_KEY) {
    return {
      mode: "sandbox-stub",
      token: `stub_${order.id}`,
      paymentPageUrl: `${env.WEB_ORIGIN}/checkout/iyzico-stub?orderId=${order.id}`,
    };
  }

  const iyzipay = new Iyzipay({
    apiKey: env.IYZICO_API_KEY,
    secretKey: env.IYZICO_SECRET_KEY,
    uri: env.IYZICO_BASE_URL,
  });

  const request = {
    locale: "tr",
    conversationId: order.id,
    price: (order.totalCents / 100).toFixed(2),
    paidPrice: (order.totalCents / 100).toFixed(2),
    currency: "TRY",
    basketId: order.id,
    paymentGroup: "PRODUCT",
    callbackUrl: `${env.API_PUBLIC_URL}/api/payments/iyzico/callback`,
    enabledInstallments: [1],
    buyer: {
      id: order.id,
      name: order.guestName.split(" ")[0] ?? order.guestName,
      surname: order.guestName.split(" ").slice(1).join(" ") || "Musteri",
      gsmNumber: order.guestPhone,
      email: order.guestEmail || "musteri@silakebap.local",
      identityNumber: "11111111111",
      registrationAddress: "N/A",
      ip: "85.34.78.112",
      city: "Istanbul",
      country: "Turkey",
    },
    shippingAddress: {
      contactName: order.guestName,
      city: "Istanbul",
      country: "Turkey",
      address: "N/A",
    },
    billingAddress: {
      contactName: order.guestName,
      city: "Istanbul",
      country: "Turkey",
      address: "N/A",
    },
    basketItems: order.items.map((item) => ({
      id: item.id,
      name: item.productName,
      category1: "Food",
      itemType: "PHYSICAL",
      price: (item.lineTotalCents / 100).toFixed(2),
    })),
  };

  const result = await new Promise<Record<string, unknown>>((resolve, reject) => {
    iyzipay.checkoutFormInitialize.create(request, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });

  if (result.status !== "success") {
    throw new HttpError(502, "iyzico initialize failed", result);
  }

  return {
    mode: "live",
    token: String(result.token ?? ""),
    paymentPageUrl: String(result.paymentPageUrl ?? ""),
  };
}

export async function completeIyzicoPayment(token: string): Promise<{
  success: boolean;
  orderId?: string;
  raw?: unknown;
}> {
  if (!env.IYZICO_API_KEY || !env.IYZICO_SECRET_KEY) {
    throw new HttpError(
      400,
      "iyzico keys missing; use simulateSuccess in development",
    );
  }

  const iyzipay = new Iyzipay({
    apiKey: env.IYZICO_API_KEY,
    secretKey: env.IYZICO_SECRET_KEY,
    uri: env.IYZICO_BASE_URL,
  });

  const result = await new Promise<Record<string, unknown>>((resolve, reject) => {
    iyzipay.checkoutForm.retrieve({ locale: "tr", token }, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });

  const success = result.status === "success" && result.paymentStatus === "SUCCESS";
  return {
    success,
    orderId: result.conversationId ? String(result.conversationId) : undefined,
    raw: result,
  };
}
