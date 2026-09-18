import type { Server } from "socket.io";
import type { Order, OrderItem, OrderItemOption } from "@silakebap/database";

type OrderPayload = Order & {
  items?: Array<OrderItem & { options?: OrderItemOption[] }>;
};

function payload(order: OrderPayload) {
  return {
    id: order.id,
    branchId: order.branchId,
    status: order.status,
    fulfillmentType: order.fulfillmentType,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    totalCents: order.totalCents,
    guestName: order.guestName,
    items: order.items,
    updatedAt: order.updatedAt,
  };
}

export function emitOrderCreated(io: Server | undefined, order: OrderPayload): void {
  if (!io) return;
  const data = payload(order);
  io.to(`branch:${order.branchId}:kitchen`).emit("order:created", data);
  io.to(`order:${order.id}`).emit("order:updated", data);
}

export function emitOrderUpdated(io: Server | undefined, order: OrderPayload): void {
  if (!io) return;
  const data = payload(order);
  io.to(`branch:${order.branchId}:kitchen`).emit("order:updated", data);
  io.to(`branch:${order.branchId}:courier`).emit("order:updated", data);
  io.to(`order:${order.id}`).emit("order:updated", data);
}
