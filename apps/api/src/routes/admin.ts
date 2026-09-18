import { Router } from "express";
import { z } from "zod";
import {
  CouponType,
  OptionGroupType,
  prisma,
} from "@silakebap/database";
import { StaffRole } from "@silakebap/shared";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { env } from "../config/env.js";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRoles(StaffRole.SUPER_ADMIN));

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

adminRouter.get("/categories", async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { products: true } } },
    });
    res.json({ categories });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/categories", async (req, res, next) => {
  try {
    const body = z
      .object({
        name: z.string().min(2),
        description: z.string().optional(),
        sortOrder: z.number().int().optional(),
      })
      .parse(req.body);
    const category = await prisma.category.create({
      data: {
        name: body.name,
        slug: slugify(body.name),
        description: body.description,
        sortOrder: body.sortOrder ?? 0,
      },
    });
    res.status(201).json({ category });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/products", async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        category: true,
        branchProducts: true,
        optionGroups: { include: { items: true } },
      },
    });
    res.json({ products });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/products", async (req, res, next) => {
  try {
    const body = z
      .object({
        categoryId: z.string().cuid(),
        name: z.string().min(2),
        description: z.string().optional(),
        basePriceCents: z.number().int().min(0),
        branchId: z.string().cuid().optional(),
        branchPriceCents: z.number().int().min(0).optional(),
      })
      .parse(req.body);

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          categoryId: body.categoryId,
          name: body.name,
          slug: `${slugify(body.name)}-${Date.now().toString(36)}`,
          description: body.description,
          basePriceCents: body.basePriceCents,
        },
      });
      if (body.branchId) {
        await tx.branchProduct.create({
          data: {
            branchId: body.branchId,
            productId: created.id,
            priceCents: body.branchPriceCents ?? body.basePriceCents,
          },
        });
      }
      return created;
    });

    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch("/products/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const body = z
      .object({
        name: z.string().min(2).optional(),
        description: z.string().nullable().optional(),
        basePriceCents: z.number().int().min(0).optional(),
        isActive: z.boolean().optional(),
        imageKey: z.string().min(1).nullable().optional(),
      })
      .parse(req.body);
    const product = await prisma.product.update({ where: { id }, data: body });
    res.json({ product });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/products/:id/image-upload", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const body = z
      .object({
        contentType: z.enum([
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",
        ]),
      })
      .parse(req.body);

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new HttpError(404, "Product not found");

    const { createProductImageUploadUrl } = await import(
      "../services/r2Service.js"
    );
    const upload = await createProductImageUploadUrl({
      productId: id,
      contentType: body.contentType,
    });
    res.json(upload);
  } catch (err) {
    next(err);
  }
});

adminRouter.put("/branch-products", async (req, res, next) => {
  try {
    const body = z
      .object({
        branchId: z.string().cuid(),
        productId: z.string().cuid(),
        priceCents: z.number().int().min(0),
        isAvailable: z.boolean().optional(),
        isVisible: z.boolean().optional(),
      })
      .parse(req.body);

    const bp = await prisma.branchProduct.upsert({
      where: {
        branchId_productId: {
          branchId: body.branchId,
          productId: body.productId,
        },
      },
      create: {
        branchId: body.branchId,
        productId: body.productId,
        priceCents: body.priceCents,
        isAvailable: body.isAvailable ?? true,
        isVisible: body.isVisible ?? true,
      },
      update: {
        priceCents: body.priceCents,
        ...(body.isAvailable != null ? { isAvailable: body.isAvailable } : {}),
        ...(body.isVisible != null ? { isVisible: body.isVisible } : {}),
      },
    });
    res.json({ branchProduct: bp });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/products/:id/option-groups", async (req, res, next) => {
  try {
    const productId = String(req.params.id);
    const body = z
      .object({
        name: z.string().min(1),
        type: z.nativeEnum(OptionGroupType),
        minSelect: z.number().int().min(0).default(0),
        maxSelect: z.number().int().min(1).default(1),
        isRequired: z.boolean().default(false),
        items: z
          .array(
            z.object({
              name: z.string().min(1),
              priceDeltaCents: z.number().int().default(0),
              isDefault: z.boolean().default(false),
            }),
          )
          .default([]),
      })
      .parse(req.body);

    const group = await prisma.optionGroup.create({
      data: {
        productId,
        name: body.name,
        type: body.type,
        minSelect: body.minSelect,
        maxSelect: body.maxSelect,
        isRequired: body.isRequired,
        items: {
          create: body.items,
        },
      },
      include: { items: true },
    });
    res.status(201).json({ group });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/branches/:branchId/zones", async (req, res, next) => {
  try {
    const branchId = String(req.params.branchId);
    const zones = await prisma.deliveryZone.findMany({
      where: { branchId },
      orderBy: { name: "asc" },
    });
    res.json({ zones });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/branches/:branchId/zones", async (req, res, next) => {
  try {
    const branchId = String(req.params.branchId);
    const body = z
      .object({
        name: z.string().min(2),
        neighborhoods: z.array(z.string()).default([]),
        feeCents: z.number().int().min(0).default(0),
        minOrderCents: z.number().int().min(0).optional(),
      })
      .parse(req.body);
    const zone = await prisma.deliveryZone.create({
      data: { branchId, ...body },
    });
    res.status(201).json({ zone });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch("/zones/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const body = z
      .object({
        name: z.string().optional(),
        neighborhoods: z.array(z.string()).optional(),
        feeCents: z.number().int().min(0).optional(),
        minOrderCents: z.number().int().nullable().optional(),
        isActive: z.boolean().optional(),
      })
      .parse(req.body);
    const zone = await prisma.deliveryZone.update({ where: { id }, data: body });
    res.json({ zone });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/branches/:branchId/hours", async (req, res, next) => {
  try {
    const branchId = String(req.params.branchId);
    const hours = await prisma.workingHours.findMany({
      where: { branchId },
      orderBy: { dayOfWeek: "asc" },
    });
    res.json({ hours });
  } catch (err) {
    next(err);
  }
});

adminRouter.put("/branches/:branchId/hours", async (req, res, next) => {
  try {
    const branchId = String(req.params.branchId);
    const body = z
      .object({
        dayOfWeek: z.number().int().min(0).max(6),
        openTime: z.string(),
        closeTime: z.string(),
        isClosed: z.boolean().default(false),
      })
      .parse(req.body);
    const hours = await prisma.workingHours.upsert({
      where: {
        branchId_dayOfWeek: { branchId, dayOfWeek: body.dayOfWeek },
      },
      create: { branchId, ...body },
      update: {
        openTime: body.openTime,
        closeTime: body.closeTime,
        isClosed: body.isClosed,
      },
    });
    res.json({ hours });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch("/branches/:branchId", async (req, res, next) => {
  try {
    const id = String(req.params.branchId);
    const body = z
      .object({
        isOpen: z.boolean().optional(),
        minOrderCents: z.number().int().min(0).optional(),
        name: z.string().optional(),
        phone: z.string().nullable().optional(),
      })
      .parse(req.body);
    const branch = await prisma.branch.update({ where: { id }, data: body });
    res.json({ branch });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/coupons", async (_req, res, next) => {
  try {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
    res.json({ coupons });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/coupons", async (req, res, next) => {
  try {
    const body = z
      .object({
        code: z.string().min(2),
        type: z.nativeEnum(CouponType),
        value: z.number().int().positive(),
        branchId: z.string().cuid().nullable().optional(),
        minOrderCents: z.number().int().min(0).default(0),
        maxUses: z.number().int().positive().nullable().optional(),
      })
      .parse(req.body);
    const coupon = await prisma.coupon.create({
      data: {
        code: body.code.toUpperCase(),
        type: body.type,
        value: body.value,
        branchId: body.branchId ?? null,
        minOrderCents: body.minOrderCents,
        maxUses: body.maxUses ?? null,
      },
    });
    res.status(201).json({ coupon });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch("/coupons/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const body = z
      .object({
        isActive: z.boolean().optional(),
        maxUses: z.number().int().nullable().optional(),
        minOrderCents: z.number().int().optional(),
      })
      .parse(req.body);
    const coupon = await prisma.coupon.update({ where: { id }, data: body });
    res.json({ coupon });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/orders", async (req, res, next) => {
  try {
    const branchId = req.query.branchId
      ? String(req.query.branchId)
      : undefined;
    const status = req.query.status ? String(req.query.status) : undefined;
    const orders = await prisma.order.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        ...(status ? { status: status as never } : {}),
      },
      include: {
        items: { include: { options: true } },
        branch: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ orders });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/me", async (req, res, next) => {
  try {
    if (!req.auth) throw new HttpError(401, "Unauthorized");
    res.json({ auth: req.auth });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/storage", async (_req, res, next) => {
  try {
    const { r2Status } = await import("../services/r2Service.js");
    res.json(r2Status());
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/integrations", async (_req, res, next) => {
  try {
    const { getEmailTransportStatus } = await import(
      "../services/emailService.js"
    );
    const { r2Status } = await import("../services/r2Service.js");
    const email = await getEmailTransportStatus();
    res.json({
      iyzico: {
        configured: Boolean(env.IYZICO_API_KEY && env.IYZICO_SECRET_KEY),
        baseUrl: env.IYZICO_BASE_URL,
        callbackUrl: `${env.API_PUBLIC_URL}/api/payments/iyzico/callback`,
        mode:
          env.IYZICO_API_KEY && env.IYZICO_SECRET_KEY
            ? "checkout-form"
            : "sandbox-stub",
      },
      email,
      storage: r2Status(),
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/integrations/email-test", async (req, res, next) => {
  try {
    const body = z
      .object({ to: z.string().email() })
      .parse(req.body);
    const { sendTestEmail } = await import("../services/emailService.js");
    const result = await sendTestEmail(body.to);
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});
