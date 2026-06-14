import { FastifyInstance } from "fastify";
import { applyCampaigns } from "@aura/shared";
import { z } from "zod";

const saleSchema = z.object({
  branchId: z.string(),
  registerId: z.string(),
  customerId: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string(),
      variantId: z.string().optional(),
      name: z.string(),
      barcode: z.string().optional(),
      quantity: z.number(),
      unitPrice: z.number(),
      discount: z.number().default(0),
      taxRate: z.number(),
      total: z.number(),
    })
  ),
  subtotal: z.number(),
  discount: z.number().default(0),
  tax: z.number(),
  total: z.number(),
  paymentMethod: z.enum(["CASH", "CARD", "QR", "CREDIT"]),
  payments: z.array(z.object({ method: z.enum(["CASH", "CARD", "QR", "CREDIT"]), amount: z.number().positive() })).optional(),
  offlineId: z.string().optional(),
  digitalReceipt: z.boolean().optional(),
  receiptEmail: z.string().optional(),
  receiptPhone: z.string().optional(),
  paymentDueDate: z.string().optional(),
  paymentPromiseNote: z.string().optional(),
});

export async function saleRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.post("/", async (req, reply) => {
    const user = req.user as { orgId: string };
    const body = saleSchema.parse(req.body);

    if (body.offlineId) {
      const existing = await app.prisma.sale.findUnique({ where: { offlineId: body.offlineId } });
      if (existing) return existing;
    }

    const campaigns = await app.prisma.campaign.findMany({
      where: { organizationId: user.orgId, isActive: true, startDate: { lte: new Date() }, endDate: { gte: new Date() } },
    });

    const campaignDiscount = applyCampaigns(
      body.items,
      campaigns.map((c) => ({
        type: c.type,
        value: Number(c.value),
        buyQuantity: c.buyQuantity ?? undefined,
        getQuantity: c.getQuantity ?? undefined,
        minAmount: c.minAmount ? Number(c.minAmount) : undefined,
      }))
    );

    const totalDiscount = body.discount + campaignDiscount;
    const finalTotal = Math.max(0, body.total - campaignDiscount);

    const receiptNo = `R${Date.now()}`;

    const paymentRows = body.payments?.length
      ? body.payments
      : [{ method: body.paymentMethod, amount: finalTotal }];

    const paymentSum = paymentRows.reduce((s, p) => s + p.amount, 0);
    if (Math.abs(paymentSum - finalTotal) > 0.02) {
      return reply.status(400).send({ error: "Ödeme tutarları toplamı satış tutarına eşit olmalı" });
    }

    const hasCredit = paymentRows.some((p) => p.method === "CREDIT");
    if (hasCredit && !body.customerId) {
      return reply.status(400).send({ error: "Veresiye için müşteri seçilmeli" });
    }

    const primaryMethod = paymentRows.length > 1
      ? paymentRows.reduce((a, b) => (b.amount > a.amount ? b : a)).method
      : paymentRows[0].method;

    const sale = await app.prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          branchId: body.branchId,
          registerId: body.registerId,
          customerId: body.customerId,
          receiptNo,
          subtotal: body.subtotal,
          discount: totalDiscount,
          tax: body.tax,
          total: finalTotal,
          paymentMethod: primaryMethod,
          offlineId: body.offlineId,
          syncedAt: new Date(),
          digitalReceipt: body.digitalReceipt ?? false,
          receiptEmail: body.receiptEmail,
          receiptPhone: body.receiptPhone,
          items: {
            create: body.items.map((i) => ({
              productId: i.productId,
              variantId: i.variantId,
              name: i.name,
              barcode: i.barcode,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              discount: i.discount,
              taxRate: i.taxRate,
              total: i.total,
            })),
          },
          payments: {
            create: paymentRows.map((p) => ({ method: p.method, amount: p.amount })),
          },
        },
        include: { items: true, payments: true },
      });

      for (const item of body.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.quantity } },
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }

      if (hasCredit && body.customerId) {
        const creditAmount = paymentRows.filter((p) => p.method === "CREDIT").reduce((s, p) => s + p.amount, 0);
        const account = await tx.customerAccount.findUnique({ where: { customerId: body.customerId } });
        if (!account) throw new Error("Cari hesap bulunamadı");
        await tx.customerAccount.update({
          where: { id: account.id },
          data: { balance: { increment: creditAmount } },
        });
        await tx.creditEntry.create({
          data: {
            accountId: account.id,
            saleId: created.id,
            amount: creditAmount,
            type: "DEBIT",
            note: "Satış veresiye",
            dueDate: body.paymentDueDate ? new Date(body.paymentDueDate) : undefined,
          },
        });
        if (body.paymentDueDate) {
          await tx.customerAccount.update({
            where: { id: account.id },
            data: {
              paymentDueDate: new Date(body.paymentDueDate),
              paymentPromiseNote: body.paymentPromiseNote || "Veresiye satış taahhüdü",
            },
          });
        }
      }

      if (body.customerId) {
        const points = Math.floor(finalTotal / 10);
        await tx.customer.update({
          where: { id: body.customerId },
          data: { loyaltyPoints: { increment: points } },
        });
        await tx.loyaltyLog.create({
          data: { customerId: body.customerId, points, reason: "Satış", saleId: created.id },
        });
      }

      return created;
    });

    return sale;
  });

  app.post("/:id/refund-items", async (req, reply) => {
    const user = req.user as { orgId: string };
    const { id } = req.params as { id: string };
    const { saleItemIds } = req.body as { saleItemIds: string[] };

    if (!saleItemIds?.length) {
      return reply.status(400).send({ error: "En az bir satır seçin" });
    }

    const sale = await app.prisma.sale.findFirst({
      where: { id, branch: { organizationId: user.orgId } },
      include: { items: true },
    });

    if (!sale || sale.status === "REFUNDED") {
      return reply.status(400).send({ error: "Bu satış iade edilemez" });
    }

    const itemsToRefund = sale.items.filter((i) => saleItemIds.includes(i.id) && !i.refunded);
    if (!itemsToRefund.length) {
      return reply.status(400).send({ error: "İade edilecek satır bulunamadı" });
    }

    await app.prisma.$transaction(async (tx) => {
      for (const item of itemsToRefund) {
        await tx.saleItem.update({ where: { id: item.id }, data: { refunded: true } });
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: Number(item.quantity) } },
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: Number(item.quantity) } },
          });
        }
      }

      const remaining = await tx.saleItem.count({
        where: { saleId: id, refunded: false },
      });

      await tx.sale.update({
        where: { id },
        data: { status: remaining === 0 ? "REFUNDED" : "PARTIAL_REFUND" },
      });
    });

    return app.prisma.sale.findUnique({
      where: { id },
      include: { items: true },
    });
  });

  app.post("/:id/refund", async (req, reply) => {
    const user = req.user as { orgId: string };
    const { id } = req.params as { id: string };
    const sale = await app.prisma.sale.findFirst({
      where: { id, branch: { organizationId: user.orgId } },
      include: { items: true },
    });
    if (!sale || sale.status === "REFUNDED") {
      return reply.status(400).send({ error: "Bu satış iade edilemez" });
    }

    const activeIds = sale.items.filter((i) => !i.refunded).map((i) => i.id);
    if (!activeIds.length) {
      return reply.status(400).send({ error: "İade edilecek satır yok" });
    }

    await app.prisma.$transaction(async (tx) => {
      for (const item of sale.items.filter((i) => !i.refunded)) {
        await tx.saleItem.update({ where: { id: item.id }, data: { refunded: true } });
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: Number(item.quantity) } },
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: Number(item.quantity) } },
          });
        }
      }
      await tx.sale.update({ where: { id }, data: { status: "REFUNDED" } });
    });

    return app.prisma.sale.findUnique({ where: { id }, include: { items: true } });
  });

  app.get("/recent", async (req) => {
    const user = req.user as { orgId: string };
    const { registerId, limit } = req.query as { registerId?: string; limit?: string };
    const sales = await app.prisma.sale.findMany({
      where: {
        branch: { organizationId: user.orgId },
        registerId: registerId || undefined,
        status: { in: ["COMPLETED", "PARTIAL_REFUND"] },
      },
      include: { items: true, payments: true, customer: true },
      orderBy: { createdAt: "desc" },
      take: Math.min(Number(limit) || 15, 30),
    });

    return sales.filter((s) => s.items.some((i) => !i.refunded));
  });

  app.get("/", async (req) => {
    const user = req.user as { orgId: string };
    const branchId = (req.query as { branchId?: string }).branchId;
    return app.prisma.sale.findMany({
      where: {
        branch: { organizationId: user.orgId, ...(branchId ? { id: branchId } : {}) },
      },
      include: { items: true, customer: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  });
}
