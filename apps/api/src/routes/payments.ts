import { Router } from "express";
import {
  OrderStatus,
  PaymentStatus,
  prisma,
} from "@silakebap/database";
import { HttpError } from "../middleware/errorHandler.js";
import { completeIyzicoPayment } from "../services/iyzicoService.js";
import { sendOrderStatusEmail } from "../services/emailService.js";
import { emitOrderCreated } from "../realtime/emit.js";
import { paymentCallbackRateLimiter } from "../middleware/rateLimit.js";
import { env } from "../config/env.js";

export const paymentsRouter = Router();

/**
 * iyzico Checkout Form callback.
 * Accepts JSON or form-urlencoded token from iyzico redirect.
 * Dev without keys: POST { orderId, simulateSuccess: true }.
 */
paymentsRouter.post("/iyzico/callback", paymentCallbackRateLimiter, async (req, res, next) => {
  try {
    const token =
      (req.body?.token as string | undefined) ??
      (typeof req.query.token === "string" ? req.query.token : undefined);
    const orderId = (req.body?.orderId as string | undefined) ?? undefined;
    const simulateSuccess = Boolean(req.body?.simulateSuccess);

    let resolvedOrderId = orderId;

    if (token && !simulateSuccess) {
      const result = await completeIyzicoPayment(token);
      resolvedOrderId = result.orderId;
      if (!result.success) {
        throw new HttpError(400, "Payment not successful", result);
      }
      if (
        result.paidPriceCents != null &&
        result.orderTotalCents != null &&
        result.paidPriceCents !== result.orderTotalCents
      ) {
        throw new HttpError(400, "Paid amount mismatch");
      }
    } else if (simulateSuccess && orderId) {
      if (env.NODE_ENV === "production") {
        throw new HttpError(403, "Simulation disabled in production");
      }
      resolvedOrderId = orderId;
    } else if (!token && !simulateSuccess) {
      throw new HttpError(400, "token or (orderId + simulateSuccess) required");
    }

    if (!resolvedOrderId) {
      throw new HttpError(400, "Could not resolve order");
    }

    const order = await prisma.order.findUnique({
      where: { id: resolvedOrderId },
      include: { items: { include: { options: true } } },
    });
    if (!order) throw new HttpError(404, "Order not found");

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      if (req.accepts("html")) {
        res.redirect(`${env.WEB_ORIGIN}/track/${order.orderNo}`);
        return;
      }
      res.json({ ok: true, orderId: order.id, status: order.status });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.RECEIVED,
          paymentStatus: PaymentStatus.PAID,
        },
        include: { items: { include: { options: true } } },
      });
      await tx.payment.updateMany({
        where: { orderId: order.id },
        data: {
          status: PaymentStatus.PAID,
          providerPaymentId: token ?? `sim_${Date.now()}`,
          providerPayload: {
            confirmedAt: new Date().toISOString(),
            source: token ? "iyzico-callback" : "simulate",
          },
        },
      });
      if (order.couponId) {
        await tx.coupon.update({
          where: { id: order.couponId },
          data: { usedCount: { increment: 1 } },
        });
      }
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: OrderStatus.PENDING_PAYMENT,
          toStatus: OrderStatus.RECEIVED,
          note: "Payment confirmed",
        },
      });
      return next;
    });

    await sendOrderStatusEmail(updated.id);
    emitOrderCreated(req.app.get("io"), updated);

    if (req.accepts("html") && !simulateSuccess) {
      res.redirect(`${env.WEB_ORIGIN}/track/${updated.orderNo}`);
      return;
    }

    res.json({
      ok: true,
      orderId: updated.id,
      status: updated.status,
      trackingToken: updated.trackingToken,
      orderNo: updated.orderNo,
    });
  } catch (err) {
    next(err);
  }
});
