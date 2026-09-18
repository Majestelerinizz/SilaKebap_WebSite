import { Router } from "express";
import {
  FulfillmentType,
  OrderStatus,
  PaymentStatus,
  prisma,
} from "@silakebap/database";
import { StaffRole } from "@silakebap/shared";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { sendOrderStatusEmail } from "../services/emailService.js";
import { emitOrderUpdated } from "../realtime/emit.js";
import { trackRateLimiter } from "../middleware/rateLimit.js";
import { z } from "zod";

export const ordersRouter = Router();

const allowedTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
  [OrderStatus.RECEIVED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
  [OrderStatus.READY]: [
    OrderStatus.COURIER_ASSIGNED,
    OrderStatus.AWAITING_PICKUP,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.COURIER_ASSIGNED]: [OrderStatus.ON_THE_WAY, OrderStatus.CANCELLED],
  [OrderStatus.ON_THE_WAY]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.AWAITING_PICKUP]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
};

ordersRouter.get("/track/:token", trackRateLimiter, async (req, res, next) => {
  try {
    const token = String(req.params.token);
    const order = await prisma.order.findUnique({
      where: { trackingToken: token },
      include: {
        items: { include: { options: true } },
        statusHistory: { orderBy: { createdAt: "asc" } },
        branch: { select: { id: true, name: true, phone: true } },
      },
    });
    if (!order) throw new HttpError(404, "Order not found");
    res.json({
      order: {
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        fulfillmentType: order.fulfillmentType,
        totalCents: order.totalCents,
        guestName: order.guestName,
        items: order.items,
        statusHistory: order.statusHistory,
        branch: order.branch,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

ordersRouter.get(
  "/branch/:branchId",
  requireAuth,
  requireRoles(StaffRole.KITCHEN, StaffRole.COURIER, StaffRole.SUPER_ADMIN),
  async (req, res, next) => {
    try {
      const branchId = String(req.params.branchId);
      if (
        !req.auth!.isSuperAdmin &&
        !req.auth!.memberships.some((m) => m.branchId === branchId)
      ) {
        throw new HttpError(403, "Forbidden for this branch");
      }

      const statusFilter = req.query.status
        ? String(req.query.status).split(",")
        : undefined;

      const orders = await prisma.order.findMany({
        where: {
          branchId,
          ...(statusFilter
            ? { status: { in: statusFilter as OrderStatus[] } }
            : {
                status: {
                  notIn: [OrderStatus.PENDING_PAYMENT, OrderStatus.CANCELLED],
                },
              }),
        },
        include: {
          items: { include: { options: true } },
          courier: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      res.json({ orders });
    } catch (err) {
      next(err);
    }
  },
);

const statusBodySchema = z.object({
  status: z.nativeEnum(OrderStatus),
  courierId: z.string().cuid().optional(),
  note: z.string().max(500).optional(),
});

ordersRouter.patch(
  "/:orderId/status",
  requireAuth,
  requireRoles(StaffRole.KITCHEN, StaffRole.COURIER, StaffRole.SUPER_ADMIN),
  async (req, res, next) => {
    try {
      const body = statusBodySchema.parse(req.body);
      const orderId = String(req.params.orderId);
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });
      if (!order) throw new HttpError(404, "Order not found");

      if (
        !req.auth!.isSuperAdmin &&
        !req.auth!.memberships.some((m) => m.branchId === order.branchId)
      ) {
        throw new HttpError(403, "Forbidden for this branch");
      }

      if (order.status === OrderStatus.PENDING_PAYMENT) {
        throw new HttpError(400, "Order awaiting payment");
      }

      const allowed = allowedTransitions[order.status] ?? [];
      if (!allowed.includes(body.status)) {
        throw new HttpError(
          400,
          `Cannot transition ${order.status} → ${body.status}`,
        );
      }

      if (
        body.status === OrderStatus.COURIER_ASSIGNED &&
        order.fulfillmentType !== FulfillmentType.DELIVERY
      ) {
        throw new HttpError(400, "Courier only for DELIVERY orders");
      }
      if (
        body.status === OrderStatus.AWAITING_PICKUP &&
        order.fulfillmentType !== FulfillmentType.PICKUP
      ) {
        throw new HttpError(400, "AWAITING_PICKUP only for PICKUP orders");
      }

      const updated = await prisma.$transaction(async (tx) => {
        const next = await tx.order.update({
          where: { id: order.id },
          data: {
            status: body.status,
            ...(body.status === OrderStatus.COURIER_ASSIGNED && body.courierId
              ? { courierId: body.courierId }
              : {}),
            ...(body.status === OrderStatus.DELIVERED &&
            (order.paymentMethod === "CASH_ON_DELIVERY" ||
              order.paymentMethod === "CARD_ON_DELIVERY" ||
              order.paymentMethod === "PAY_AT_STORE")
              ? { paymentStatus: PaymentStatus.PAID }
              : {}),
          },
          include: {
            items: { include: { options: true } },
          },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: order.status,
            toStatus: body.status,
            note: body.note,
            changedById: req.auth!.sub,
          },
        });
        if (
          body.status === OrderStatus.DELIVERED &&
          (order.paymentMethod === "CASH_ON_DELIVERY" ||
            order.paymentMethod === "CARD_ON_DELIVERY" ||
            order.paymentMethod === "PAY_AT_STORE")
        ) {
          await tx.payment.updateMany({
            where: { orderId: order.id },
            data: { status: PaymentStatus.PAID },
          });
        }
        return next;
      });

      await sendOrderStatusEmail(updated.id);
      emitOrderUpdated(req.app.get("io"), updated);

      res.json({ order: updated });
    } catch (err) {
      next(err);
    }
  },
);
