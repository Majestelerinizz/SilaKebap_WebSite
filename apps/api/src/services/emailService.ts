import nodemailer from "nodemailer";
import { prisma } from "@silakebap/database";
import { formatTryLabel } from "@silakebap/shared";
import { env } from "../config/env.js";

function createTransport() {
  if (!env.SMTP_HOST) {
    return null;
  }
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
  });
}

export async function getEmailTransportStatus() {
  return {
    configured: Boolean(env.SMTP_HOST),
    host: env.SMTP_HOST || null,
    port: env.SMTP_PORT,
    from: env.SMTP_FROM,
    mode: env.SMTP_HOST ? "smtp" : "console-fallback",
  };
}

export async function sendTestEmail(to: string): Promise<{ mode: string }> {
  const subject = "Sıla Kebap — SMTP test";
  const text = "SMTP bağlantısı çalışıyor.";
  const transport = createTransport();
  if (!transport) {
    console.log(`[email:dev] TEST To: ${to}\n${subject}\n${text}`);
    return { mode: "console-fallback" };
  }
  await transport.sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    text,
    html: `<p>${text}</p>`,
  });
  return { mode: "smtp" };
}

export async function sendOrderStatusEmail(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { branch: true, items: true },
  });
  if (!order?.guestEmail) {
    console.log(`[email] skip order ${orderId}: no guest email`);
    return;
  }

  const trackingUrl = `${env.WEB_ORIGIN}/track/${order.trackingToken}`;
  const subject = `Sipariş güncellemesi — ${order.branch.name} (${order.status})`;
  const itemLines = order.items
    .map((i) => `${i.quantity}× ${i.productName}`)
    .join(", ");
  const text = [
    `Merhaba ${order.guestName},`,
    "",
    `Sipariş durumunuz: ${order.status}`,
    `Ürünler: ${itemLines}`,
    `Toplam: ${formatTryLabel(order.totalCents)}`,
    `Takip: ${trackingUrl}`,
    "",
    "Afiyet olsun,",
    "Sıla Kebap",
  ].join("\n");

  const html = `
    <div style="font-family:Georgia,serif;max-width:520px;line-height:1.5;color:#1c1410">
      <h1 style="font-size:22px;margin:0 0 12px">Sıla Kebap</h1>
      <p>Merhaba ${order.guestName},</p>
      <p>Sipariş durumunuz: <strong>${order.status}</strong></p>
      <p>${itemLines}</p>
      <p>Toplam: <strong>${formatTryLabel(order.totalCents)}</strong></p>
      <p><a href="${trackingUrl}" style="color:#b34a1c">Siparişini takip et</a></p>
      <p style="color:#6b5b4f">Afiyet olsun.</p>
    </div>
  `;

  const transport = createTransport();
  if (!transport) {
    console.log(`[email:dev] To: ${order.guestEmail}\n${subject}\n${text}`);
    return;
  }

  await transport.sendMail({
    from: env.SMTP_FROM,
    to: order.guestEmail,
    subject,
    text,
    html,
  });
}
