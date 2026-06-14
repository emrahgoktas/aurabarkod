import { FastifyInstance } from "fastify";

function periodRange(period: string) {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === "monthly") {
    start.setDate(1);
  } else if (period === "yearly") {
    start.setMonth(0, 1);
  }
  return { start, end };
}

export async function reportRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.post("/z-report", async (req, reply) => {
    const user = req.user as { orgId: string };
    const { branchId, registerId, reportDate } = req.body as {
      branchId: string;
      registerId: string;
      reportDate?: string;
    };

    const branch = await app.prisma.branch.findFirst({
      where: { id: branchId, organizationId: user.orgId },
    });
    if (!branch) return reply.status(404).send({ error: "Şube bulunamadı" });

    const register = await app.prisma.cashRegister.findFirst({
      where: { id: registerId, branchId },
    });
    if (!register) return reply.status(404).send({ error: "Kasa bulunamadı" });

    const date = reportDate ? new Date(reportDate) : new Date();
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const sales = await app.prisma.sale.findMany({
      where: { branchId, registerId, createdAt: { gte: start, lte: end }, status: "COMPLETED" },
      include: { payments: true },
    });

    const refunds = await app.prisma.sale.findMany({
      where: { branchId, registerId, createdAt: { gte: start, lte: end }, status: "REFUNDED" },
    });

    const totals = sales.reduce(
      (acc, s) => {
        acc.totalSales += Number(s.total);
        acc.saleCount += 1;
        for (const p of s.payments) {
          if (p.method === "CASH") acc.cashTotal += Number(p.amount);
          if (p.method === "CARD") acc.cardTotal += Number(p.amount);
          if (p.method === "QR") acc.qrTotal += Number(p.amount);
          if (p.method === "CREDIT") acc.creditTotal += Number(p.amount);
        }
        return acc;
      },
      { totalSales: 0, saleCount: 0, cashTotal: 0, cardTotal: 0, qrTotal: 0, creditTotal: 0 }
    );

    const totalRefunds = refunds.reduce((s, r) => s + Number(r.total), 0);

    return app.prisma.zReport.upsert({
      where: { registerId_reportDate: { registerId, reportDate: start } },
      update: { ...totals, totalRefunds },
      create: { branchId, registerId, reportDate: start, ...totals, totalRefunds },
    });
  });

  app.get("/z-report/:registerId", async (req, reply) => {
    const user = req.user as { orgId: string };
    const { registerId } = req.params as { registerId: string };

    const register = await app.prisma.cashRegister.findFirst({
      where: { id: registerId, branch: { organizationId: user.orgId } },
    });
    if (!register) return reply.status(404).send({ error: "Kasa bulunamadı" });
    const date = (req.query as { date?: string }).date;
    const reportDate = date ? new Date(date) : new Date();
    reportDate.setHours(0, 0, 0, 0);
    return app.prisma.zReport.findUnique({
      where: { registerId_reportDate: { registerId, reportDate } },
    });
  });

  app.get("/dashboard", async (req) => {
    const user = req.user as { orgId: string };
    const period = (req.query as { period?: string }).period || "daily";
    const { start, end } = periodRange(period);

    const sales = await app.prisma.sale.findMany({
      where: {
        branch: { organizationId: user.orgId },
        createdAt: { gte: start, lte: end },
        status: "COMPLETED",
      },
      include: { items: true, payments: true },
    });

    const revenue = sales.reduce((s, x) => s + Number(x.total), 0);
    const saleCount = sales.length;
    const avgBasket = saleCount > 0 ? revenue / saleCount : 0;

    const payments = { cash: 0, card: 0, qr: 0, credit: 0 };
    for (const sale of sales) {
      for (const p of sale.payments) {
        if (p.method === "CASH") payments.cash += Number(p.amount);
        if (p.method === "CARD") payments.card += Number(p.amount);
        if (p.method === "QR") payments.qr += Number(p.amount);
        if (p.method === "CREDIT") payments.credit += Number(p.amount);
      }
    }

    const productMap = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const sale of sales) {
      for (const item of sale.items) {
        const key = item.productId;
        const cur = productMap.get(key) || { name: item.name, qty: 0, revenue: 0 };
        cur.qty += Number(item.quantity);
        cur.revenue += Number(item.total);
        productMap.set(key, cur);
      }
    }
    const topProducts = [...productMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    const [productCount, customerCount, lowStock, overdueAccounts] = await Promise.all([
      app.prisma.product.count({ where: { organizationId: user.orgId, isActive: true } }),
      app.prisma.customer.count({ where: { organizationId: user.orgId } }),
      app.prisma.product.findMany({ where: { organizationId: user.orgId, isActive: true } }),
      app.prisma.customerAccount.count({
        where: {
          balance: { gt: 0 },
          paymentDueDate: { lt: new Date(new Date().setHours(0, 0, 0, 0)) },
          customer: { organizationId: user.orgId },
        },
      }),
    ]);

    const lowStockCount = lowStock.filter((p) => Number(p.stock) <= Number(p.minStock)).length;

    const creditBalance = await app.prisma.customerAccount.aggregate({
      where: { customer: { organizationId: user.orgId }, balance: { gt: 0 } },
      _sum: { balance: true },
    });

    // Günlük trend (son 7 gün — sadece daily periodda anlamlı)
    const dailyTrend: Array<{ date: string; revenue: number; count: number }> = [];
    if (period === "daily") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const dEnd = new Date(d);
        dEnd.setHours(23, 59, 59, 999);
        const daySales = sales.filter((s) => s.createdAt >= d && s.createdAt <= dEnd);
        dailyTrend.push({
          date: d.toLocaleDateString("tr-TR", { weekday: "short", day: "numeric" }),
          revenue: daySales.reduce((s, x) => s + Number(x.total), 0),
          count: daySales.length,
        });
      }
    } else {
      // Aylık trend — son 6 ay veya yıllık son 12 ay
      const months = period === "yearly" ? 12 : 6;
      for (let i = months - 1; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i, 1);
        d.setHours(0, 0, 0, 0);
        const dEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
        const monthSales = await app.prisma.sale.findMany({
          where: {
            branch: { organizationId: user.orgId },
            createdAt: { gte: d, lte: dEnd },
            status: "COMPLETED",
          },
        });
        dailyTrend.push({
          date: d.toLocaleDateString("tr-TR", { month: "short", year: period === "yearly" ? "2-digit" : undefined }),
          revenue: monthSales.reduce((s, x) => s + Number(x.total), 0),
          count: monthSales.length,
        });
      }
    }

    return {
      period,
      periodLabel: period === "daily" ? "Bugün" : period === "monthly" ? "Bu Ay" : "Bu Yıl",
      revenue,
      saleCount,
      avgBasket,
      payments,
      topProducts,
      productCount,
      customerCount,
      lowStockCount,
      overdueCount: overdueAccounts,
      totalCreditBalance: Number(creditBalance._sum.balance || 0),
      trend: dailyTrend,
    };
  });
}
