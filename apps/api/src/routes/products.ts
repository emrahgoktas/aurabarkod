import { FastifyInstance } from "fastify";
import { parseScaleBarcode } from "@aura/shared";
import { z } from "zod";
import { verifyBranchBelongsToOrg, verifyProductBelongsToOrg } from "../lib/tenant";

const productSchema = z.object({
  name: z.string().min(1),
  barcode: z.string().optional(),
  sku: z.string().optional(),
  price: z.number().positive(),
  costPrice: z.number().optional(),
  taxRate: z.number().default(20),
  stock: z.number().default(0),
  minStock: z.number().default(10),
  unit: z.string().default("adet"),
  isWeighted: z.boolean().default(false),
  categoryId: z.string().optional(),
  imageUrl: z.string().optional(),
});

export async function productRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/", async (req) => {
    const user = req.user as { orgId: string };
    const { search: q, all: allParam, outOfStock } = req.query as { search?: string; all?: string; outOfStock?: string };
    const showAll = allParam === "1";
    const products = await app.prisma.product.findMany({
      where: {
        organizationId: user.orgId,
        ...(showAll ? {} : { isActive: true }),
        ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { barcode: { contains: q } }] } : {}),
      },
      include: { variants: true, category: true },
      orderBy: { name: "asc" },
      take: 200,
    });

    if (outOfStock === "1") {
      return products.filter((p) => {
        if (p.hasVariants && p.variants.length > 0) {
          return p.variants.every((v) => Number(v.stock) <= 0);
        }
        return Number(p.stock) <= 0;
      });
    }

    return products;
  });

  app.get("/categories", async (req) => {
    const user = req.user as { orgId: string };
    return app.prisma.category.findMany({ where: { organizationId: user.orgId }, orderBy: { name: "asc" } });
  });

  app.get("/low-stock", async (req) => {
    const user = req.user as { orgId: string };
    const products = await app.prisma.product.findMany({
      where: { organizationId: user.orgId, isActive: true },
      include: { category: true },
      orderBy: { stock: "asc" },
    });
    return products.filter((p) => Number(p.stock) <= Number(p.minStock));
  });

  app.post("/bulk-price", async (req, reply) => {
    const user = req.user as { orgId: string };
    const { percent, categoryId, productIds } = req.body as {
      percent: number;
      categoryId?: string;
      productIds?: string[];
    };

    if (!percent || percent <= -100) {
      return reply.status(400).send({ error: "Geçerli bir yüzde girin" });
    }

    const where: Record<string, unknown> = {
      organizationId: user.orgId,
      isActive: true,
      ...(categoryId ? { categoryId } : {}),
      ...(productIds?.length ? { id: { in: productIds } } : {}),
    };

    const products = await app.prisma.product.findMany({ where: where as any });
    if (!products.length) return reply.status(404).send({ error: "Güncellenecek ürün bulunamadı" });

    const multiplier = 1 + percent / 100;
    let updated = 0;

    await app.prisma.$transaction(
      products.map((p) => {
        const newPrice = Math.round(Number(p.price) * multiplier * 100) / 100;
        updated++;
        return app.prisma.product.update({ where: { id: p.id }, data: { price: newPrice } });
      })
    );

    return { updated, percent, message: `${updated} ürünün fiyatı %${percent} güncellendi` };
  });

  app.get("/barcode/:code", async (req, reply) => {
    const user = req.user as { orgId: string };
    const { code } = req.params as { code: string };

    const scale = parseScaleBarcode(code);
    if (scale) {
      const product = await app.prisma.product.findFirst({
        where: {
          organizationId: user.orgId,
          barcode: { endsWith: scale.productCode },
          isWeighted: true,
        },
        include: { variants: true },
      });
      if (product) {
        const unitPrice = Number(product.price);
        return {
          ...product,
          scaleWeight: scale.weightKg,
          calculatedPrice: unitPrice * scale.weightKg,
          quantity: scale.weightKg,
        };
      }
    }

    const variant = await app.prisma.productVariant.findFirst({
      where: { barcode: code },
      include: { product: { include: { variants: true } } },
    });
    if (variant && variant.product.organizationId === user.orgId) {
      return {
        ...variant.product,
        selectedVariant: variant,
        price: variant.price ?? variant.product.price,
        stock: variant.stock,
      };
    }

    const product = await app.prisma.product.findFirst({
      where: { organizationId: user.orgId, barcode: code, isActive: true },
      include: { variants: true },
    });
    if (!product) return reply.status(404).send({ error: "Ürün bulunamadı" });
    return product;
  });

  app.get("/shortcuts/:branchId", async (req) => {
    const { branchId } = req.params as { branchId: string };
    return app.prisma.productShortcut.findMany({
      where: { branchId },
      include: { product: true },
      orderBy: { keySlot: "asc" },
    });
  });

  app.get("/:id", async (req, reply) => {
    const user = req.user as { orgId: string };
    const { id } = req.params as { id: string };
    const product = await app.prisma.product.findFirst({
      where: { id, organizationId: user.orgId },
      include: { variants: true, category: true },
    });
    if (!product) return reply.status(404).send({ error: "Ürün bulunamadı" });
    return product;
  });

  app.post("/", async (req, reply) => {
    const user = req.user as { orgId: string };
    const body = productSchema.parse(req.body);
    if (body.barcode) {
      const exists = await app.prisma.product.findFirst({
        where: { organizationId: user.orgId, barcode: body.barcode },
      });
      if (exists) return reply.status(409).send({ error: "Bu barkod zaten kayıtlı" });
    }
    return app.prisma.product.create({
      data: {
        ...body,
        imageUrl: body.imageUrl || null,
        organizationId: user.orgId,
      },
      include: { category: true },
    });
  });

  app.put("/:id", async (req, reply) => {
    const user = req.user as { orgId: string };
    const { id } = req.params as { id: string };
    const body = productSchema.partial().parse(req.body);

    const existing = await app.prisma.product.findFirst({ where: { id, organizationId: user.orgId } });
    if (!existing) return reply.status(404).send({ error: "Ürün bulunamadı" });

    if (body.barcode && body.barcode !== existing.barcode) {
      const dup = await app.prisma.product.findFirst({
        where: { organizationId: user.orgId, barcode: body.barcode, NOT: { id } },
      });
      if (dup) return reply.status(409).send({ error: "Bu barkod başka üründe kayıtlı" });
    }

    return app.prisma.product.update({
      where: { id },
      data: { ...body, imageUrl: body.imageUrl === "" ? null : body.imageUrl },
      include: { category: true, variants: true },
    });
  });

  app.patch("/:id/price", async (req, reply) => {
    const user = req.user as { orgId: string };
    const { id } = req.params as { id: string };
    const { price } = req.body as { price: number };
    const existing = await app.prisma.product.findFirst({ where: { id, organizationId: user.orgId } });
    if (!existing) return reply.status(404).send({ error: "Ürün bulunamadı" });
    return app.prisma.product.update({ where: { id }, data: { price } });
  });

  app.patch("/:id/stock", async (req, reply) => {
    const user = req.user as { orgId: string };
    const { id } = req.params as { id: string };
    const { stock, adjustment } = req.body as { stock?: number; adjustment?: number };
    const existing = await app.prisma.product.findFirst({ where: { id, organizationId: user.orgId } });
    if (!existing) return reply.status(404).send({ error: "Ürün bulunamadı" });
    const newStock = adjustment !== undefined ? Number(existing.stock) + adjustment : stock!;
    return app.prisma.product.update({ where: { id }, data: { stock: newStock } });
  });

  app.delete("/:id", async (req, reply) => {
    const user = req.user as { orgId: string };
    const { id } = req.params as { id: string };
    const existing = await app.prisma.product.findFirst({ where: { id, organizationId: user.orgId } });
    if (!existing) return reply.status(404).send({ error: "Ürün bulunamadı" });
    return app.prisma.product.update({ where: { id }, data: { isActive: false } });
  });

  app.post("/:id/variants", async (req, reply) => {
    const user = req.user as { orgId: string };
    const { id } = req.params as { id: string };
    const existing = await verifyProductBelongsToOrg(app, id, user.orgId);
    if (!existing) return reply.status(404).send({ error: "Ürün bulunamadı" });

    const data = z.object({
      barcode: z.string().optional(),
      size: z.string().optional(),
      color: z.string().optional(),
      price: z.number().optional(),
      stock: z.number().default(0),
      sku: z.string().optional(),
    }).parse(req.body);

    await app.prisma.product.update({ where: { id }, data: { hasVariants: true } });
    return app.prisma.productVariant.create({ data: { ...data, productId: id } });
  });

  app.delete("/:id/variants/:variantId", async (req, reply) => {
    const user = req.user as { orgId: string };
    const { id, variantId } = req.params as { id: string; variantId: string };
    const existing = await verifyProductBelongsToOrg(app, id, user.orgId);
    if (!existing) return reply.status(404).send({ error: "Ürün bulunamadı" });
    await app.prisma.productVariant.delete({ where: { id: variantId } });
    return { ok: true };
  });

  app.put("/shortcuts/:branchId", async (req, reply) => {
    const user = req.user as { orgId: string };
    const { branchId } = req.params as { branchId: string };
    const branch = await verifyBranchBelongsToOrg(app, branchId, user.orgId);
    if (!branch) return reply.status(404).send({ error: "Şube bulunamadı" });

    const { shortcuts } = req.body as { shortcuts: Array<{ keySlot: number; productId: string }> };
    for (const s of shortcuts) {
      const prod = await app.prisma.product.findFirst({ where: { id: s.productId, organizationId: user.orgId } });
      if (!prod) return reply.status(400).send({ error: "Geçersiz ürün" });
    }

    await app.prisma.productShortcut.deleteMany({ where: { branchId } });
    await app.prisma.productShortcut.createMany({
      data: shortcuts.map((s) => ({ branchId, keySlot: s.keySlot, productId: s.productId })),
    });
    return { ok: true };
  });
}
