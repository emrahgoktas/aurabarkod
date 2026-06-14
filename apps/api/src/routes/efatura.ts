import { FastifyInstance } from "fastify";
import { requireTenant } from "../lib/tenant";
import { getEInvoiceProvider } from "../services/efatura";

export async function efaturaRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);
  app.addHook("onRequest", requireTenant);

  app.get("/config", async () => {
    const provider = process.env.EFATURA_PROVIDER || "mock";
    return {
      provider,
      gibConfigured: !!(process.env.GIB_USERNAME && process.env.GIB_PASSWORD),
      testMode: process.env.GIB_TEST_MODE !== "false",
      availableProviders: ["mock", "gib"],
    };
  });

  app.post("/issue/:saleId", async (req, reply) => {
    const user = req.user as { orgId: string };
    const { saleId } = req.params as { saleId: string };

    const sale = await app.prisma.sale.findFirst({
      where: { id: saleId, branch: { organizationId: user.orgId } },
      include: {
        items: true,
        customer: true,
        branch: { include: { organization: { include: { receiptSettings: true } } } },
      },
    });
    if (!sale) return reply.status(404).send({ error: "Satış bulunamadı" });

    const org = sale.branch.organization;
    const receipt = org.receiptSettings;
    const provider = getEInvoiceProvider();

    const result = await provider.issue({
      saleId: sale.id,
      receiptNo: sale.receiptNo,
      total: Number(sale.total),
      tax: Number(sale.tax),
      items: sale.items.map((i) => ({
        name: i.name,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        taxRate: Number(i.taxRate),
        total: Number(i.total),
      })),
      buyer: sale.customer ? { name: sale.customer.name } : undefined,
      seller: {
        name: receipt?.storeName || org.name,
        taxNumber: receipt?.taxNumber || org.taxNumber,
        taxOffice: receipt?.taxOffice || org.taxOffice,
      },
    });

    const record = await app.prisma.eInvoiceRecord.upsert({
      where: { saleId },
      update: {
        status: result.status,
        uuid: result.uuid,
        provider: result.provider,
        response: (result.raw || { message: result.message }) as object,
      },
      create: {
        saleId,
        uuid: result.uuid,
        status: result.status,
        provider: result.provider,
        response: (result.raw || { message: result.message }) as object,
      },
    });

    return { ...record, message: result.message };
  });

  app.get("/status/:saleId", async (req, reply) => {
    const user = req.user as { orgId: string };
    const { saleId } = req.params as { saleId: string };

    const sale = await app.prisma.sale.findFirst({
      where: { id: saleId, branch: { organizationId: user.orgId } },
    });
    if (!sale) return reply.status(404).send({ error: "Satış bulunamadı" });

    const record = await app.prisma.eInvoiceRecord.findUnique({ where: { saleId } });
    if (!record) return reply.status(404).send({ error: "e-Fatura kaydı yok" });
    return record;
  });
}
