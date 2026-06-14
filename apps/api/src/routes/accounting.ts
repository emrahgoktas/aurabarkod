import { FastifyInstance } from "fastify";
import fs from "fs";
import path from "path";
import { requireTenant } from "../lib/tenant";

function toLogoCsv(sales: Array<{
  receiptNo: string;
  createdAt: Date;
  total: number;
  tax: number;
  items: Array<{ name: string; qty: number; total: number }>;
}>) {
  const lines = ["FisNo;Tarih;Toplam;KDV;Kalem;Miktar;Tutar"];
  for (const s of sales) {
    for (const item of s.items) {
      lines.push(
        [s.receiptNo, s.createdAt.toISOString().slice(0, 10), s.total.toFixed(2), s.tax.toFixed(2), item.name, item.qty, item.total.toFixed(2)].join(";")
      );
    }
  }
  return lines.join("\n");
}

export async function accountingRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);
  app.addHook("onRequest", requireTenant);

  app.post("/export", async (req) => {
    const user = req.user as { orgId: string };
    const { provider, periodStart, periodEnd } = req.body as {
      provider: string;
      periodStart: string;
      periodEnd: string;
    };

    const sales = await app.prisma.sale.findMany({
      where: {
        branch: { organizationId: user.orgId },
        createdAt: { gte: new Date(periodStart), lte: new Date(periodEnd) },
        status: "COMPLETED",
      },
      include: { items: true },
    });

    const mapped = sales.map((s) => ({
      receiptNo: s.receiptNo,
      createdAt: s.createdAt,
      total: Number(s.total),
      tax: Number(s.tax),
      items: s.items.map((i) => ({ name: i.name, qty: Number(i.quantity), total: Number(i.total) })),
    }));

    const exportDir = process.env.BACKUP_DIR || "./backups";
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

    const fileName = `logo-export-${user.orgId}-${Date.now()}.csv`;
    const filePath = path.join(exportDir, fileName);
    const csv = toLogoCsv(mapped);
    fs.writeFileSync(filePath, "\uFEFF" + csv, "utf8");

    return app.prisma.accountingExport.create({
      data: {
        organizationId: user.orgId,
        provider,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        status: "completed",
        filePath,
      },
    });
  });

  app.get("/exports", async (req) => {
    const user = req.user as { orgId: string };
    return app.prisma.accountingExport.findMany({
      where: { organizationId: user.orgId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  });

  app.get("/exports/:id/download", async (req, reply) => {
    const user = req.user as { orgId: string };
    const { id } = req.params as { id: string };
    const exp = await app.prisma.accountingExport.findFirst({
      where: { id, organizationId: user.orgId },
    });
    if (!exp?.filePath || !fs.existsSync(exp.filePath)) {
      return reply.status(404).send({ error: "Dosya bulunamadı" });
    }
    const content = fs.readFileSync(exp.filePath, "utf8");
    reply.header("Content-Type", "text/csv; charset=utf-8");
    reply.header("Content-Disposition", `attachment; filename="logo-export-${id}.csv"`);
    return content;
  });
}
