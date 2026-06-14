import { FastifyInstance } from "fastify";
import { requireTenant } from "../lib/tenant";

export async function syncRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);
  app.addHook("onRequest", requireTenant);

  app.get("/pending", async (req) => {
    const user = req.user as { orgId: string };
    return app.prisma.syncQueue.findMany({
      where: { organizationId: user.orgId, status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
  });

  app.post("/push", async (req) => {
    const user = req.user as { orgId: string };
    const { items } = req.body as { items: Array<{ entityType: string; entityId: string; payload: unknown }> };
    const created = await app.prisma.syncQueue.createMany({
      data: items.map((i) => ({
        organizationId: user.orgId,
        entityType: i.entityType,
        entityId: i.entityId,
        payload: i.payload as object,
        status: "PENDING",
      })),
    });
    return { queued: created.count };
  });

  app.post("/process", async (req, reply) => {
    const user = req.user as { orgId: string };
    const pending = await app.prisma.syncQueue.findMany({
      where: { organizationId: user.orgId, status: "PENDING" },
      take: 50,
    });

    let synced = 0;
    let failed = 0;

    for (const item of pending) {
      try {
        if (item.entityType === "sale") {
          const payload = item.payload as Record<string, unknown>;
          const res = await app.inject({
            method: "POST",
            url: "/api/sales",
            payload,
            headers: { authorization: req.headers.authorization || "" },
          });
          if (res.statusCode >= 400) throw new Error(res.payload as string);
        }
        await app.prisma.syncQueue.update({
          where: { id: item.id },
          data: { status: "SYNCED", syncedAt: new Date() },
        });
        synced++;
      } catch (err) {
        await app.prisma.syncQueue.update({
          where: { id: item.id },
          data: { status: "FAILED", retries: { increment: 1 }, error: String(err) },
        });
        failed++;
      }
    }

    return { synced, failed };
  });

  app.get("/status", async (req) => {
    const user = req.user as { orgId: string };
    const [pending, failed, synced] = await Promise.all([
      app.prisma.syncQueue.count({ where: { organizationId: user.orgId, status: "PENDING" } }),
      app.prisma.syncQueue.count({ where: { organizationId: user.orgId, status: "FAILED" } }),
      app.prisma.syncQueue.count({ where: { organizationId: user.orgId, status: "SYNCED" } }),
    ]);
    return { pending, failed, synced, online: true };
  });
}
