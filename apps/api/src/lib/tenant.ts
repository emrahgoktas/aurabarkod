import { FastifyInstance } from "fastify";

export type JwtUser = { sub: string; orgId?: string; branchId?: string; role: string };

export function getOrgId(req: { user: JwtUser }): string {
  const orgId = req.user.orgId;
  if (!orgId) throw new Error("ORG_REQUIRED");
  return orgId;
}

export async function requireTenant(req: any, reply: any) {
  const user = req.user as JwtUser;
  if (!user.orgId) {
    return reply.status(403).send({ error: "Tenant bağlamı gerekli" });
  }
}

export async function verifyBranchBelongsToOrg(
  app: FastifyInstance,
  branchId: string,
  orgId: string
) {
  return app.prisma.branch.findFirst({
    where: { id: branchId, organizationId: orgId, isActive: true },
    include: { registers: { where: { isActive: true } } },
  });
}

export async function verifyRegisterBelongsToOrg(
  app: FastifyInstance,
  registerId: string,
  orgId: string
) {
  return app.prisma.cashRegister.findFirst({
    where: { id: registerId, isActive: true, branch: { organizationId: orgId, isActive: true } },
    include: { branch: true },
  });
}

export async function verifyCustomerBelongsToOrg(
  app: FastifyInstance,
  customerId: string,
  orgId: string
) {
  return app.prisma.customer.findFirst({
    where: { id: customerId, organizationId: orgId },
    include: { account: true },
  });
}

export async function verifyCampaignBelongsToOrg(
  app: FastifyInstance,
  campaignId: string,
  orgId: string
) {
  return app.prisma.campaign.findFirst({
    where: { id: campaignId, organizationId: orgId },
  });
}

export async function verifyProductBelongsToOrg(
  app: FastifyInstance,
  productId: string,
  orgId: string
) {
  return app.prisma.product.findFirst({
    where: { id: productId, organizationId: orgId },
    include: { variants: true },
  });
}

export async function verifySupplierBelongsToOrg(
  app: FastifyInstance,
  supplierId: string,
  orgId: string
) {
  return app.prisma.supplier.findFirst({
    where: { id: supplierId, organizationId: orgId },
  });
}

export async function getTenantLimits(app: FastifyInstance) {
  const platform = await app.prisma.platformConfig.findUnique({ where: { id: "aura-platform" } });
  return {
    trialDays: platform?.trialDays ?? 14,
    maxTrialUsers: platform?.maxTrialUsers ?? 5,
    maxTrialProducts: platform?.maxTrialProducts ?? 100,
  };
}

export async function getTenantContext(app: FastifyInstance, orgId: string) {
  const org = await app.prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) return null;
  const limits = await getTenantLimits(app);
  const [userCount, productCount] = await Promise.all([
    app.prisma.user.count({ where: { organizationId: orgId, isActive: true } }),
    app.prisma.product.count({ where: { organizationId: orgId, isActive: true } }),
  ]);
  const trialExpired =
    org.status === "TRIAL" && org.trialExpiresAt ? new Date() > org.trialExpiresAt : false;
  return {
    organization: org,
    limits,
    usage: { users: userCount, products: productCount },
    trialExpired,
    trialDaysLeft: org.trialExpiresAt
      ? Math.max(0, Math.ceil((org.trialExpiresAt.getTime() - Date.now()) / 86400000))
      : limits.trialDays,
  };
}
