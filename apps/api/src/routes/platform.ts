import { FastifyInstance } from "fastify";
import { z } from "zod";

export async function platformRoutes(app: FastifyInstance) {
  app.addHook("onRequest", async (req: any, reply: any) => {
    await app.authenticate(req, reply);
    if (reply.sent) return;
    const user = req.user as { role: string };
    if (user.role !== "platform_admin") {
      return reply.status(403).send({ error: "Platform yöneticisi yetkisi gerekli" });
    }
  });

  app.get("/overview", async () => {
    const [tenantCount, activeCount, trialCount, platform] = await Promise.all([
      app.prisma.organization.count(),
      app.prisma.organization.count({ where: { status: "ACTIVE" } }),
      app.prisma.organization.count({ where: { status: "TRIAL" } }),
      app.prisma.platformConfig.findUnique({ where: { id: "aura-platform" } }),
    ]);
    return {
      platform: platform || { name: "Aura Barkod" },
      stats: { tenantCount, activeCount, trialCount },
    };
  });

  app.get("/tenants", async () => {
    return app.prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        name: true,
        email: true,
        phone: true,
        taxNumber: true,
        taxOffice: true,
        packageType: true,
        status: true,
        trialExpiresAt: true,
        setupCompletedAt: true,
        createdAt: true,
        subscription: { select: { plan: true, monthlyPrice: true, status: true, currentPeriodEnd: true } },
        _count: { select: { users: true, branches: true, products: true } },
      },
    });
  });

  app.patch("/tenants/:id/status", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { status } = z.object({ status: z.enum(["TRIAL", "ACTIVE", "SUSPENDED"]) }).parse(req.body);
    const tenant = await app.prisma.organization.findUnique({ where: { id } });
    if (!tenant) return reply.status(404).send({ error: "Tenant bulunamadı" });
    return app.prisma.organization.update({ where: { id }, data: { status } });
  });
}
