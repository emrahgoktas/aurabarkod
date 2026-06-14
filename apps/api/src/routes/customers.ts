import { FastifyInstance } from "fastify";
import { z } from "zod";

const customerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  creditLimit: z.number().optional(),
  paymentDueDate: z.string().optional(),
  paymentPromiseNote: z.string().optional(),
});

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysBetween(from: Date, to: Date) {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export async function customerRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/", async (req) => {
    const user = req.user as { orgId: string };
    const { search: q, debtOnly } = req.query as { search?: string; debtOnly?: string };
    const customers = await app.prisma.customer.findMany({
      where: {
        organizationId: user.orgId,
        ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {}),
        ...(debtOnly === "1" ? { account: { balance: { gt: 0 } } } : {}),
      },
      include: { account: true },
      orderBy: { name: "asc" },
      take: 100,
    });

    const today = startOfToday();
    return customers.map((c) => ({
      ...c,
      overdue: c.account && Number(c.account.balance) > 0 && c.account.paymentDueDate
        ? new Date(c.account.paymentDueDate) < today
        : false,
      daysOverdue: c.account?.paymentDueDate && Number(c.account.balance) > 0
        ? daysBetween(new Date(c.account.paymentDueDate), today)
        : 0,
    }));
  });

  app.get("/alerts", async (req) => {
    const user = req.user as { orgId: string };
    const today = startOfToday();
    const in3days = new Date(today);
    in3days.setDate(in3days.getDate() + 3);

    const accounts = await app.prisma.customerAccount.findMany({
      where: {
        balance: { gt: 0 },
        paymentDueDate: { not: null },
        customer: { organizationId: user.orgId },
      },
      include: { customer: true },
      orderBy: { paymentDueDate: "asc" },
    });

    const overdue = accounts
      .filter((a) => a.paymentDueDate && new Date(a.paymentDueDate) < today)
      .map((a) => ({
        customerId: a.customer.id,
        name: a.customer.name,
        phone: a.customer.phone,
        balance: Number(a.balance),
        dueDate: a.paymentDueDate,
        daysOverdue: daysBetween(new Date(a.paymentDueDate!), today),
        note: a.paymentPromiseNote,
      }));

    const upcoming = accounts
      .filter((a) => a.paymentDueDate && new Date(a.paymentDueDate) >= today && new Date(a.paymentDueDate) <= in3days)
      .map((a) => ({
        customerId: a.customer.id,
        name: a.customer.name,
        phone: a.customer.phone,
        balance: Number(a.balance),
        dueDate: a.paymentDueDate,
        daysLeft: daysBetween(today, new Date(a.paymentDueDate!)),
        note: a.paymentPromiseNote,
      }));

    return {
      overdueCount: overdue.length,
      upcomingCount: upcoming.length,
      overdue,
      upcoming,
    };
  });

  app.get("/:id/ledger", async (req, reply) => {
    const user = req.user as { orgId: string };
    const { id } = req.params as { id: string };
    const today = startOfToday();

    const customer = await app.prisma.customer.findFirst({
      where: { id, organizationId: user.orgId },
      include: { account: true },
    });
    if (!customer) return reply.status(404).send({ error: "Müşteri bulunamadı" });
    if (!customer.account) return reply.status(404).send({ error: "Bu müşterinin cari hesabı yok" });

    const entries = await app.prisma.creditEntry.findMany({
      where: { accountId: customer.account.id },
      orderBy: { createdAt: "asc" },
    });

    const saleIds = entries.map((e) => e.saleId).filter(Boolean) as string[];
    const sales = saleIds.length
      ? await app.prisma.sale.findMany({
          where: { id: { in: saleIds } },
          select: { id: true, receiptNo: true, total: true },
        })
      : [];

    let runningBalance = 0;
    const movements = entries.map((e) => {
      const amount = Number(e.amount);
      runningBalance += amount;
      const sale = sales.find((s) => s.id === e.saleId);
      const isDebit = e.type === "DEBIT";
      const dueDate = e.dueDate;
      const isOverdue = isDebit && dueDate && new Date(dueDate) < today && runningBalance > 0;

      return {
        id: e.id,
        date: e.createdAt,
        type: e.type,
        label: isDebit ? "Veresiye Satış" : "Tahsilat",
        description: e.note || (isDebit ? "Veresiye alışveriş" : "Ödeme"),
        debit: isDebit ? amount : 0,
        credit: !isDebit ? Math.abs(amount) : 0,
        balance: runningBalance,
        saleId: e.saleId,
        receiptNo: sale?.receiptNo,
        dueDate,
        isOverdue,
      };
    });

    const accountDue = customer.account.paymentDueDate;
    const isAccountOverdue = Number(customer.account.balance) > 0 && accountDue && new Date(accountDue) < today;

    return {
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        creditLimit: Number(customer.account.creditLimit),
        currentBalance: Number(customer.account.balance),
        paymentDueDate: accountDue,
        paymentPromiseNote: customer.account.paymentPromiseNote,
        isOverdue: isAccountOverdue,
        daysOverdue: isAccountOverdue && accountDue ? daysBetween(new Date(accountDue), today) : 0,
      },
      movements: movements.reverse(),
    };
  });

  app.patch("/:id/promise", async (req, reply) => {
    const user = req.user as { orgId: string };
    const { id } = req.params as { id: string };
    const { paymentDueDate, paymentPromiseNote } = req.body as {
      paymentDueDate?: string | null;
      paymentPromiseNote?: string;
    };

    const customer = await app.prisma.customer.findFirst({
      where: { id, organizationId: user.orgId },
      include: { account: true },
    });
    if (!customer?.account) return reply.status(404).send({ error: "Cari hesap bulunamadı" });

    return app.prisma.customerAccount.update({
      where: { id: customer.account.id },
      data: {
        paymentDueDate: paymentDueDate ? new Date(paymentDueDate) : null,
        paymentPromiseNote: paymentPromiseNote ?? customer.account.paymentPromiseNote,
      },
    });
  });

  app.get("/:id", async (req, reply) => {
    const user = req.user as { orgId: string };
    const { id } = req.params as { id: string };
    const customer = await app.prisma.customer.findFirst({
      where: { id, organizationId: user.orgId },
      include: { account: true },
    });
    if (!customer) return reply.status(404).send({ error: "Müşteri bulunamadı" });
    return customer;
  });

  app.post("/", async (req) => {
    const user = req.user as { orgId: string };
    const data = customerSchema.parse(req.body);
    const customer = await app.prisma.customer.create({
      data: {
        organizationId: user.orgId,
        name: data.name,
        phone: data.phone,
        email: data.email || undefined,
      },
    });
    if (data.creditLimit && data.creditLimit > 0) {
      await app.prisma.customerAccount.create({
        data: {
          customerId: customer.id,
          creditLimit: data.creditLimit,
          paymentDueDate: data.paymentDueDate ? new Date(data.paymentDueDate) : undefined,
          paymentPromiseNote: data.paymentPromiseNote,
        },
      });
    }
    return app.prisma.customer.findUnique({ where: { id: customer.id }, include: { account: true } });
  });

  app.put("/:id", async (req, reply) => {
    const user = req.user as { orgId: string };
    const { id } = req.params as { id: string };
    const data = customerSchema.partial().parse(req.body);

    const existing = await app.prisma.customer.findFirst({ where: { id, organizationId: user.orgId } });
    if (!existing) return reply.status(404).send({ error: "Müşteri bulunamadı" });

    await app.prisma.customer.update({
      where: { id },
      data: { name: data.name, phone: data.phone, email: data.email || undefined },
    });

    if (data.creditLimit !== undefined || data.paymentDueDate !== undefined || data.paymentPromiseNote !== undefined) {
      const account = await app.prisma.customerAccount.findUnique({ where: { customerId: id } });
      if (account) {
        await app.prisma.customerAccount.update({
          where: { id: account.id },
          data: {
            ...(data.creditLimit !== undefined ? { creditLimit: data.creditLimit } : {}),
            ...(data.paymentDueDate !== undefined
              ? { paymentDueDate: data.paymentDueDate ? new Date(data.paymentDueDate) : null }
              : {}),
            ...(data.paymentPromiseNote !== undefined ? { paymentPromiseNote: data.paymentPromiseNote } : {}),
          },
        });
      } else if (data.creditLimit && data.creditLimit > 0) {
        await app.prisma.customerAccount.create({
          data: {
            customerId: id,
            creditLimit: data.creditLimit,
            paymentDueDate: data.paymentDueDate ? new Date(data.paymentDueDate) : undefined,
            paymentPromiseNote: data.paymentPromiseNote,
          },
        });
      }
    }

    return app.prisma.customer.findUnique({ where: { id }, include: { account: true } });
  });

  app.post("/:id/payment", async (req, reply) => {
    const user = req.user as { orgId: string };
    const { id } = req.params as { id: string };
    const { amount, note } = req.body as { amount: number; note?: string };

    const customer = await app.prisma.customer.findFirst({
      where: { id, organizationId: user.orgId },
      include: { account: true },
    });
    if (!customer?.account) return reply.status(400).send({ error: "Cari hesap yok" });

    const account = customer.account;

    const newBalance = Number(account.balance) - amount;
    await app.prisma.$transaction([
      app.prisma.customerAccount.update({
        where: { id: account.id },
        data: {
          balance: { decrement: amount },
          ...(newBalance <= 0 ? { paymentDueDate: null, paymentPromiseNote: null } : {}),
        },
      }),
      app.prisma.creditEntry.create({
        data: { accountId: account.id, amount: -amount, type: "CREDIT", note: note || "Tahsilat" },
      }),
    ]);
    return { ok: true, newBalance };
  });
}
