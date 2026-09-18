import { Router } from "express";
import { prisma } from "@silakebap/database";
import { HttpError } from "../middleware/errorHandler.js";
import { mediaPublicUrl } from "../services/r2Service.js";

export const catalogRouter = Router();

function productImageUrl(imageKey: string | null): string | null {
  return imageKey ? mediaPublicUrl(imageKey) : null;
}

catalogRouter.get("/branches", async (_req, res, next) => {
  try {
    const branches = await prisma.branch.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        isOpen: true,
        minOrderCents: true,
        city: true,
        district: true,
        addressLine1: true,
        phone: true,
      },
    });
    res.json({ branches });
  } catch (err) {
    next(err);
  }
});

catalogRouter.get("/branches/:slugOrId", async (req, res, next) => {
  try {
    const key = req.params.slugOrId;
    const branch = await prisma.branch.findFirst({
      where: {
        OR: [{ id: key }, { slug: key }],
      },
      include: {
        deliveryZones: { where: { isActive: true } },
        workingHours: { orderBy: { dayOfWeek: "asc" } },
      },
    });
    if (!branch) throw new HttpError(404, "Branch not found");
    res.json({ branch });
  } catch (err) {
    next(err);
  }
});

catalogRouter.get("/branches/:branchId/menu", async (req, res, next) => {
  try {
    const branchId = String(req.params.branchId);
    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) throw new HttpError(404, "Branch not found");

    const branchProducts = await prisma.branchProduct.findMany({
      where: { branchId, isVisible: true },
      include: {
        product: {
          include: {
            category: true,
            optionGroups: {
              orderBy: { sortOrder: "asc" },
              include: {
                items: {
                  where: { isActive: true },
                  orderBy: { sortOrder: "asc" },
                },
              },
            },
          },
        },
      },
    });

    const categoriesMap = new Map<
      string,
      {
        id: string;
        name: string;
        slug: string;
        sortOrder: number;
        products: unknown[];
      }
    >();

    for (const bp of branchProducts) {
      if (!bp.product.isActive) continue;
      const cat = bp.product.category;
      if (!categoriesMap.has(cat.id)) {
        categoriesMap.set(cat.id, {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          sortOrder: cat.sortOrder,
          products: [],
        });
      }
      categoriesMap.get(cat.id)!.products.push({
        id: bp.product.id,
        name: bp.product.name,
        slug: bp.product.slug,
        description: bp.product.description,
        imageKey: bp.product.imageKey,
        imageUrl: productImageUrl(bp.product.imageKey),
        priceCents: bp.priceCents,
        isAvailable: bp.isAvailable,
        optionGroups: bp.product.optionGroups,
      });
    }

    const categories = [...categoriesMap.values()].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );

    res.json({ branchId, categories });
  } catch (err) {
    next(err);
  }
});

catalogRouter.get(
  "/branches/:branchId/products/:productId",
  async (req, res, next) => {
    try {
      const branchId = String(req.params.branchId);
      const productId = String(req.params.productId);
      const bp = await prisma.branchProduct.findUnique({
        where: {
          branchId_productId: { branchId, productId },
        },
        include: {
          product: {
            include: {
              category: true,
              optionGroups: {
                orderBy: { sortOrder: "asc" },
                include: {
                  items: {
                    where: { isActive: true },
                    orderBy: { sortOrder: "asc" },
                  },
                },
              },
            },
          },
        },
      });
      if (!bp || !bp.isVisible || !bp.product.isActive) {
        throw new HttpError(404, "Product not found");
      }
      res.json({
        branchId,
        product: {
          id: bp.product.id,
          name: bp.product.name,
          slug: bp.product.slug,
          description: bp.product.description,
          imageKey: bp.product.imageKey,
          imageUrl: productImageUrl(bp.product.imageKey),
          priceCents: bp.priceCents,
          isAvailable: bp.isAvailable,
          category: bp.product.category,
          optionGroups: bp.product.optionGroups,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);