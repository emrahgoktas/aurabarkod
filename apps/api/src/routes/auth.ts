import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getTenantContext, verifyBranchBelongsToOrg, verifyRegisterBelongsToOrg } from "../lib/tenant";

async function buildSession(app: FastifyInstance, userId: string, orgId?: string | null) {
  if (!orgId) return { branches: [], defaultBranchId: null, defaultRegisterId: null, tenant: null };

  const [branches, tenantCtx] = await Promise.all([
    app.prisma.branch.findMany({
      where: { organizationId: orgId, isActive: true },
      include: { registers: { where: { isActive: true }, orderBy: { code: "asc" } } },
      orderBy: { name: "asc" },
    }),
    getTenantContext(app, orgId),
  ]);

  const user = await app.prisma.user.findUnique({ where: { id: userId } });
  let defaultBranchId = user?.branchId ?? null;
  let defaultRegisterId: string | null = null;

  if (defaultBranchId) {
    const branch = branches.find((b) => b.id === defaultBranchId);
    defaultRegisterId = branch?.registers[0]?.id ?? null;
  }
  if (!defaultBranchId && branches.length > 0) {
    defaultBranchId = branches[0].id;
    defaultRegisterId = branches[0].registers[0]?.id ?? null;
  }

  return {
    branches: branches.map((b) => ({
      id: b.id,
      name: b.name,
      registers: b.registers.map((r) => ({ id: r.id, name: r.name, code: r.code })),
    })),
    defaultBranchId,
    defaultRegisterId,
    tenant: tenantCtx
      ? {
          status: tenantCtx.organization.status,
          trialExpiresAt: tenantCtx.organization.trialExpiresAt,
          trialDaysLeft: tenantCtx.trialDaysLeft,
          trialExpired: tenantCtx.trialExpired,
          limits: tenantCtx.limits,
          usage: tenantCtx.usage,
        }
      : null,
  };
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/login", async (req, reply) => {
    const body = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
    const user = await app.prisma.user.findUnique({
      where: { email: body.email },
      include: { organization: true },
    });
    if (!user || !user.isActive) return reply.status(401).send({ error: "Geçersiz giriş" });
    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) return reply.status(401).send({ error: "Geçersiz giriş" });

    if (user.role !== "platform_admin") {
      if (!user.organization) return reply.status(403).send({ error: "İşletme bulunamadı" });
      if (user.organization.status === "SUSPENDED") {
        return reply.status(403).send({ error: "Hesabınız askıya alınmış. Destek ile iletişime geçin." });
      }
      const sub = await app.prisma.tenantSubscription.findUnique({
        where: { organizationId: user.organization.id },
      });
      const ctx = await getTenantContext(app, user.organization.id);
      if (ctx?.trialExpired && (!sub || sub.plan === "TRIAL")) {
        return reply.status(403).send({ error: "Deneme süreniz doldu. Platform yöneticisi ile iletişime geçin." });
      }
    }

    const session = await buildSession(app, user.id, user.organizationId);
    const token = app.jwt.sign({
      sub: user.id,
      orgId: user.organizationId ?? undefined,
      branchId: session.defaultBranchId ?? user.branchId ?? undefined,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: user.organization
          ? {
              id: user.organization.id,
              slug: user.organization.slug,
              name: user.organization.name,
              packageType: user.organization.packageType,
              status: user.organization.status,
            }
          : null,
      },
      session: {
        branchId: session.defaultBranchId,
        registerId: session.defaultRegisterId,
        branches: session.branches,
        tenant: session.tenant,
      },
    };
  });

  app.get("/session", { onRequest: [app.authenticate] }, async (req) => {
    const payload = req.user as { sub: string; orgId?: string };
    const user = await app.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { organization: true },
    });
    if (!user) return null;
    const session = await buildSession(app, user.id, user.organizationId);
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: user.organization
          ? {
              id: user.organization.id,
              slug: user.organization.slug,
              name: user.organization.name,
              packageType: user.organization.packageType,
              status: user.organization.status,
            }
          : null,
      },
      branchId: session.defaultBranchId,
      registerId: session.defaultRegisterId,
      branches: session.branches,
      tenant: session.tenant,
    };
  });

  app.post("/workspace", { onRequest: [app.authenticate] }, async (req, reply) => {
    const user = req.user as { sub: string; orgId?: string; role: string };
    if (!user.orgId) return reply.status(403).send({ error: "Tenant gerekli" });

    const { branchId, registerId } = z
      .object({ branchId: z.string(), registerId: z.string() })
      .parse(req.body);

    const branch = await verifyBranchBelongsToOrg(app, branchId, user.orgId);
    if (!branch) return reply.status(404).send({ error: "Şube bulunamadı" });

    const register = branch.registers.find((r) => r.id === registerId);
    if (!register) return reply.status(404).send({ error: "Kasa bulunamadı" });

    await app.prisma.user.update({
      where: { id: user.sub },
      data: { branchId },
    });

    const token = app.jwt.sign({
      sub: user.sub,
      orgId: user.orgId,
      branchId,
      role: user.role,
    });

    return { token, branchId, registerId };
  });

  app.get("/me", { onRequest: [app.authenticate] }, async (req) => {
    const payload = req.user as { sub: string };
    const user = await app.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { organization: true },
    });
    if (!user) return null;
    return {
      ...user,
      organization: user.organization
        ? {
            id: user.organization.id,
            slug: user.organization.slug,
            name: user.organization.name,
            packageType: user.organization.packageType,
            status: user.organization.status,
          }
        : null,
    };
  });
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; orgId?: string; branchId?: string; role: string };
    user: { sub: string; orgId?: string; branchId?: string; role: string };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: any, reply: any) => Promise<void>;
  }
}
