import { Router } from "express";
import { PaymentMethod } from "@silakebap/shared";
import {
  createOrderFromCheckout,
  parseCheckoutBody,
  priceCheckout,
} from "../services/checkoutService.js";
import { startIyzicoPayment } from "../services/iyzicoService.js";
import { sendOrderStatusEmail } from "../services/emailService.js";
import { emitOrderCreated } from "../realtime/emit.js";
import { checkoutRateLimiter } from "../middleware/rateLimit.js";
import { env } from "../config/env.js";

export const checkoutRouter = Router();

checkoutRouter.post("/quote", checkoutRateLimiter, async (req, res, next) => {
  try {
    const input = parseCheckoutBody(req.body);
    const priced = await priceCheckout(input);
    res.json({
      subtotalCents: priced.subtotalCents,
      deliveryFeeCents: priced.deliveryFeeCents,
      discountCents: priced.discountCents,
      totalCents: priced.totalCents,
      lines: priced.lines,
    });
  } catch (err) {
    next(err);
  }
});

checkoutRouter.post("/", checkoutRateLimiter, async (req, res, next) => {
  try {
    const input = parseCheckoutBody(req.body);
    const priced = await priceCheckout(input);
    const order = await createOrderFromCheckout(priced);

    let iyzico: { paymentPageUrl?: string; token?: string } | null = null;

    if (input.paymentMethod === PaymentMethod.IYZICO_ONLINE) {
      iyzico = await startIyzicoPayment(order);
    } else {
      await sendOrderStatusEmail(order.id);
      emitOrderCreated(req.app.get("io"), order);
    }

    res.status(201).json({
      order: {
        id: order.id,
        orderNo: order.orderNo,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        totalCents: order.totalCents,
        trackingToken: order.trackingToken,
        trackingUrl: `${env.WEB_ORIGIN}/track/${order.orderNo}`,
      },
      iyzico,
    });
  } catch (err) {
    next(err);
  }
});
