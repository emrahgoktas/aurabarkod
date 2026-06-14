import { FastifyInstance } from "fastify";
import fs from "fs";
import path from "path";

export async function backupRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.post("/create", async (req) => {
    const user = req.user as { orgId: string };
    const backupDir = process.env.BACKUP_DIR || "./backups";
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const [products, sales, customers] = await Promise.all([
      app.prisma.product.findMany({ where: { organizationId: user.orgId }, include: { variants: true } }),
      app.prisma.sale.findMany({ where: { branch: { organizationId: user.orgId } }, include: { items: true }, take: 1000 }),
      app.prisma.customer.findMany({ where: { organizationId: user.orgId }, include: { account: true } }),
    ]);

    const backup = { version: "1.0", createdAt: new Date().toISOString(), products, sales, customers };
    const fileName = `backup-${user.orgId}-${Date.now()}.json`;
    const filePath = path.join(backupDir, fileName);
    const content = JSON.stringify(backup, null, 2);
    fs.writeFileSync(filePath, content);

    const log = await app.prisma.backupLog.create({
      data: {
        organizationId: user.orgId,
        filePath,
        sizeBytes: Buffer.byteLength(content),
        status: "completed",
      },
    });

    return { ok: true, backup: log };
  });

  app.get("/list", async (req) => {
    const user = req.user as { orgId: string };
    return app.prisma.backupLog.findMany({
      where: { organizationId: user.orgId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  });
}
