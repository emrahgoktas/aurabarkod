import { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireTenant } from "../lib/tenant";

const PLANS = ["TRIAL", "STARTER", "PRO", "ENTERPRISE"] as const;
const PLAN_PRICES: Record<string, number> = {
  TRIAL: 0,
  STARTER: 499,
  PRO: 999,
  ENTERPRISE: 2499,
};

export async function billingRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);
  app.addHook("onRequest", requireTenant);

  app.get("/subscription", async (req) => {
    const user = req.user as { orgId: string };
    let sub = await app.prisma.tenantSubscription.findUnique({
      where: { organizationId: user.orgId },
    });
    if (!sub) {
      sub = await app.prisma.tenantSubscription.create({
        data: { organizationId: user.orgId, plan: "TRIAL", monthlyPrice: 0 },
      });
    }
    const org = await app.prisma.organization.findUnique({ where: { id: user.orgId } });
    return {
      ...sub,
      monthlyPrice: Number(sub.monthlyPrice),
      organizationStatus: org?.status,
      trialExpiresAt: org?.trialExpiresAt,
      planLabel: planLabel(sub.plan),
      features: planFeatures(sub.plan),
    };
  });

  app.get("/plans", async () => {
    return PLANS.map((plan) => ({
      plan,
      label: planLabel(plan),
      monthlyPrice: PLAN_PRICES[plan],
      features: planFeatures(plan),
    }));
  });
}

export async function platformBillingRoutes(app: FastifyInstance) {
  app.addHook("onRequest", async (req: any, reply: any) => {
    await app.authenticate(req, reply);
    if (reply.sent) return;
    if ((req.user as { role: string }).role !== "platform_admin") {
      return reply.status(403).send({ error: "Platform yöneticisi yetkisi gerekli" });
    }
  });

  app.patch("/tenants/:id/subscription", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = z.object({
      plan: z.enum(["TRIAL", "STARTER", "PRO", "ENTERPRISE"]),
      status: z.enum(["active", "past_due", "canceled"]).optional(),
    }).parse(req.body);

    const org = await app.prisma.organization.findUnique({ where: { id } });
    if (!org) return reply.status(404).send({ error: "Tenant bulunamadı" });

    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const sub = await app.prisma.tenantSubscription.upsert({
      where: { organizationId: id },
      update: {
        plan: body.plan,
        monthlyPrice: PLAN_PRICES[body.plan],
        status: body.status || "active",
        currentPeriodEnd: body.plan === "TRIAL" ? null : periodEnd,
      },
      create: {
        organizationId: id,
        plan: body.plan,
        monthlyPrice: PLAN_PRICES[body.plan],
        status: body.status || "active",
        currentPeriodEnd: body.plan === "TRIAL" ? null : periodEnd,
      },
    });

    if (body.plan !== "TRIAL") {
      await app.prisma.organization.update({
        where: { id },
        data: { status: "ACTIVE" },
      });
    }

    return { ...sub, monthlyPrice: Number(sub.monthlyPrice) };
  });
}

function planLabel(plan: string) {
  const labels: Record<string, string> = {
    TRIAL: "Deneme",
    STARTER: "Başlangıç",
    PRO: "Profesyonel",
    ENTERPRISE: "Kurumsal",
  };
  return labels[plan] || plan;
}

function planFeatures(plan: string) {
  const base = ["POS", "Offline sync", "Raporlar"];
  if (plan === "TRIAL") return [...base, "14 gün deneme", "5 kullanıcı"];
  if (plan === "STARTER") return [...base, "1 şube", "2 kasa", "E-posta destek"];
  if (plan === "PRO") return [...base, "Çoklu şube", "Kampanya", "e-Fatura", "Öncelikli destek"];
  return [...base, "Sınırsız şube", "API erişimi", "Özel SLA", "Dedicated destek"];
}
