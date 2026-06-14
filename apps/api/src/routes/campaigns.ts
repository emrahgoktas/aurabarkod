import { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireTenant, verifyCampaignBelongsToOrg } from "../lib/tenant";

const campaignSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["PERCENTAGE", "FIXED", "BUY_X_GET_Y", "SEASONAL"]),
  value: z.number().nonnegative(),
  buyQuantity: z.number().int().positive().optional(),
  getQuantity: z.number().int().positive().optional(),
  minAmount: z.number().nonnegative().optional(),
  startDate: z.string(),
  endDate: z.string(),
  isActive: z.boolean().optional(),
});

export async function campaignRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);
  app.addHook("onRequest", requireTenant);

  app.get("/", async (req) => {
    const user = req.user as { orgId: string };
    return app.prisma.campaign.findMany({
      where: { organizationId: user.orgId },
      orderBy: { createdAt: "desc" },
    });
  });

  app.get("/roi", async (req) => {
    const user = req.user as { orgId: string };
    const campaigns = await app.prisma.campaign.findMany({
      where: { organizationId: user.orgId },
      orderBy: { createdAt: "desc" },
    });

    const sales = await app.prisma.sale.findMany({
      where: {
        branch: { organizationId: user.orgId },
        status: "COMPLETED",
        discount: { gt: 0 },
      },
      select: { id: true, total: true, discount: true, subtotal: true, createdAt: true },
      take: 500,
      orderBy: { createdAt: "desc" },
    });

    const totalDiscount = sales.reduce((s, x) => s + Number(x.discount), 0);
    const discountedRevenue = sales.reduce((s, x) => s + Number(x.total), 0);

    return {
      campaigns: campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        isActive: c.isActive,
        startDate: c.startDate,
        endDate: c.endDate,
      })),
      stats: {
        discountedSaleCount: sales.length,
        totalDiscountGiven: totalDiscount,
        revenueFromDiscountedSales: discountedRevenue,
        activeCampaigns: campaigns.filter((c) => c.isActive).length,
      },
    };
  });

  app.post("/", async (req, reply) => {
    const user = req.user as { orgId: string; role: string };
    if (user.role === "cashier") return reply.status(403).send({ error: "Yetkisiz" });

    const data = campaignSchema.parse(req.body);
    return app.prisma.campaign.create({
      data: {
        organizationId: user.orgId,
        name: data.name,
        type: data.type,
        value: data.value,
        buyQuantity: data.buyQuantity,
        getQuantity: data.getQuantity,
        minAmount: data.minAmount,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        isActive: data.isActive ?? true,
      },
    });
  });

  app.put("/:id", async (req, reply) => {
    const user = req.user as { orgId: string; role: string };
    if (user.role === "cashier") return reply.status(403).send({ error: "Yetkisiz" });

    const { id } = req.params as { id: string };
    const existing = await verifyCampaignBelongsToOrg(app, id, user.orgId);
    if (!existing) return reply.status(404).send({ error: "Kampanya bulunamadı" });

    const data = campaignSchema.partial().parse(req.body);
    return app.prisma.campaign.update({
      where: { id },
      data: {
        ...data,
        ...(data.startDate ? { startDate: new Date(data.startDate) } : {}),
        ...(data.endDate ? { endDate: new Date(data.endDate) } : {}),
      },
    });
  });

  app.delete("/:id", async (req, reply) => {
    const user = req.user as { orgId: string; role: string };
    if (user.role === "cashier") return reply.status(403).send({ error: "Yetkisiz" });

    const { id } = req.params as { id: string };
    const existing = await verifyCampaignBelongsToOrg(app, id, user.orgId);
    if (!existing) return reply.status(404).send({ error: "Kampanya bulunamadı" });

    await app.prisma.campaign.delete({ where: { id } });
    return { ok: true };
  });
}
