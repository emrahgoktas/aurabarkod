import { FastifyInstance } from "fastify";
import { z } from "zod";

const settingsSchema = z.object({
  storeName: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  taxNumber: z.string().optional(),
  taxOffice: z.string().optional(),
  mersisNo: z.string().optional(),
  footerText: z.string().optional(),
  paperWidth: z.enum(["MM_58", "MM_80"]).default("MM_80"),
  fontScale: z.enum(["small", "normal", "large"]).default("normal"),
  printerBrand: z.string().optional(),
  printerModel: z.string().optional(),
  printerConnection: z.enum(["USB", "ETHERNET", "WIFI", "BLUETOOTH"]).default("USB"),
  autoPrint: z.boolean().default(true),
  showTaxDetails: z.boolean().default(true),
  showCashierName: z.boolean().default(true),
});

export async function receiptRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/settings", async (req) => {
    const user = req.user as { orgId: string };
    const settings = await app.prisma.receiptSettings.findUnique({
      where: { organizationId: user.orgId },
    });
    if (settings) return settings;

    const org = await app.prisma.organization.findUnique({ where: { id: user.orgId } });
    const branch = await app.prisma.branch.findFirst({ where: { organizationId: user.orgId } });
    return {
      storeName: org?.name || "Mağaza",
      address: branch?.address || null,
      phone: branch?.phone || null,
      taxNumber: org?.taxNumber || null,
      paperWidth: "MM_80",
      fontScale: "normal",
      printerConnection: "USB",
      autoPrint: true,
      showTaxDetails: true,
      showCashierName: true,
      footerText: "Bizi tercih ettiğiniz için teşekkürler!",
    };
  });

  app.put("/settings", async (req, reply) => {
    const user = req.user as { orgId: string; role: string };
    if (user.role === "cashier") {
      return reply.status(403).send({ error: "Fiş ayarlarını sadece yönetici değiştirebilir" });
    }

    const body = settingsSchema.parse(req.body);
    return app.prisma.receiptSettings.upsert({
      where: { organizationId: user.orgId },
      update: body,
      create: { organizationId: user.orgId, ...body },
    });
  });
}
