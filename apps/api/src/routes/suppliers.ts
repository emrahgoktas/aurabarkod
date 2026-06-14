import { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireTenant, verifyProductBelongsToOrg, verifySupplierBelongsToOrg } from "../lib/tenant";

const supplierSchema = z.object({
  name: z.string().min(1),
  taxNumber: z.string().optional(),
  phone: z.string().optional(),
});

const invoiceItemSchema = z.object({
  barcode: z.string().optional(),
  name: z.string().min(1),
  qty: z.number().positive(),
  price: z.number().nonnegative(),
});

const invoiceSchema = z.object({
  supplierId: z.string(),
  invoiceNo: z.string().min(1),
  items: z.array(invoiceItemSchema).min(1),
});

export async function supplierRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);
  app.addHook("onRequest", requireTenant);

  app.get("/", async (req) => {
    const user = req.user as { orgId: string };
    return app.prisma.supplier.findMany({
      where: { organizationId: user.orgId },
      include: { _count: { select: { invoices: true } } },
      orderBy: { name: "asc" },
    });
  });

  app.post("/", async (req) => {
    const user = req.user as { orgId: string };
    const data = supplierSchema.parse(req.body);
    return app.prisma.supplier.create({
      data: { ...data, organizationId: user.orgId },
    });
  });

  app.get("/invoices", async (req) => {
    const user = req.user as { orgId: string };
    return app.prisma.purchaseInvoice.findMany({
      where: { supplier: { organizationId: user.orgId } },
      include: { supplier: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  });

  app.post("/invoices", async (req, reply) => {
    const user = req.user as { orgId: string; role: string };
    if (user.role === "cashier") return reply.status(403).send({ error: "Yetkisiz" });

    const data = invoiceSchema.parse(req.body);
    const supplier = await verifySupplierBelongsToOrg(app, data.supplierId, user.orgId);
    if (!supplier) return reply.status(404).send({ error: "Tedarikçi bulunamadı" });

    const total = data.items.reduce((s, i) => s + i.qty * i.price, 0);

    const result = await app.prisma.$transaction(async (tx) => {
      const invoice = await tx.purchaseInvoice.create({
        data: {
          supplierId: data.supplierId,
          invoiceNo: data.invoiceNo,
          total,
          items: data.items,
        },
      });

      for (const item of data.items) {
        if (!item.barcode) continue;
        const product = await tx.product.findFirst({
          where: { organizationId: user.orgId, barcode: item.barcode },
        });
        if (product) {
          await tx.product.update({
            where: { id: product.id },
            data: { stock: { increment: item.qty } },
          });
        } else {
          await tx.product.create({
            data: {
              organizationId: user.orgId,
              name: item.name,
              barcode: item.barcode,
              price: item.price * 1.2,
              costPrice: item.price,
              stock: item.qty,
              unit: "adet",
            },
          });
        }
      }

      return invoice;
    });

    return result;
  });

  app.get("/:id", async (req, reply) => {
    const user = req.user as { orgId: string };
    const { id } = req.params as { id: string };
    const supplier = await verifySupplierBelongsToOrg(app, id, user.orgId);
    if (!supplier) return reply.status(404).send({ error: "Tedarikçi bulunamadı" });
    const invoices = await app.prisma.purchaseInvoice.findMany({
      where: { supplierId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return { ...supplier, invoices };
  });
}
