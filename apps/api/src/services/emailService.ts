import nodemailer from "nodemailer";
import { prisma } from "@silakebap/database";
import { formatTryLabel, orderStatusLabel } from "@silakebap/shared";
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

async function safeSend(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<{ mode: string }> {
  const transport = createTransport();
  if (!transport) {
    console.log(`[email:dev] To: ${opts.to}\n${opts.subject}\n${opts.text}`);
    return { mode: "console-fallback" };
  }
  await transport.sendMail({
    from: env.SMTP_FROM,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });
  return { mode: "smtp" };
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
  return safeSend({
    to,
    subject: "Sıla Kebap — SMTP test",
    text: "SMTP bağlantısı çalışıyor.",
    html: `<p style="font-family:Georgia,serif">SMTP bağlantısı çalışıyor.</p>`,
  });
}

export async function sendOrderStatusEmail(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { branch: true, items: true },
    });
    if (!order?.guestEmail) {
      console.log(`[email] skip order ${orderId}: no guest email`);
      return;
    }

    const trackingUrl = `${env.WEB_ORIGIN}/track/${order.orderNo}`;
    const statusTr = orderStatusLabel(order.status);
    const isNew =
      order.status === "RECEIVED" || order.status === "PENDING_PAYMENT";
    const subject = isNew
      ? `Siparişiniz alındı — ${order.orderNo}`
      : `Sipariş güncellemesi — ${order.orderNo} · ${statusTr}`;
    const itemLines = order.items
      .map((i) => `${i.quantity}× ${i.productName}`)
      .join(", ");
    const greeting = isNew
      ? "Siparişiniz bize ulaştı. Afiyet olsun!"
      : `Sipariş durumunuz güncellendi: ${statusTr}`;

    const text = [
      `Merhaba ${order.guestName},`,
      "",
      greeting,
      `Sipariş No: ${order.orderNo}`,
      `Durum: ${statusTr}`,
      `Ürünler: ${itemLines}`,
      `Toplam: ${formatTryLabel(order.totalCents)}`,
      `Takip: ${trackingUrl}`,
      "",
      "Sıla Kebap",
    ].join("\n");

    const html = `
    <div style="font-family:Georgia,serif;max-width:520px;line-height:1.55;color:#1c1410;background:#fffaf6;padding:24px;border-radius:12px">
      <h1 style="font-size:22px;margin:0 0 8px;color:#b34a1c">Sıla Kebap</h1>
      <p style="margin:0 0 16px;color:#6b5b4f">${order.branch.name}</p>
      <p>Merhaba <strong>${order.guestName}</strong>,</p>
      <p>${greeting}</p>
      <p>Sipariş No: <strong>${order.orderNo}</strong></p>
      <p style="font-size:18px">Durum: <strong style="color:#b34a1c">${statusTr}</strong></p>
      <p style="color:#4a3f36">${itemLines}</p>
      <p>Toplam: <strong>${formatTryLabel(order.totalCents)}</strong></p>
      <p style="margin:24px 0">
        <a href="${trackingUrl}" style="display:inline-block;background:#ff6b35;color:#140e0b;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:999px">
          Siparişini takip et
        </a>
      </p>
      <p style="color:#6b5b4f;font-size:14px">Afiyet olsun.</p>
    </div>
  `;

    await safeSend({ to: order.guestEmail, subject, text, html });
  } catch (err) {
    console.error(`[email] failed for order ${orderId}`, err);
  }
}
