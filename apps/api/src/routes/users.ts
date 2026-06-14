import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getTenantLimits, requireTenant } from "../lib/tenant";

const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  role: z.enum(["admin", "cashier"]).default("cashier"),
  branchId: z.string().optional(),
});

export async function userRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);
  app.addHook("onRequest", requireTenant);

  app.get("/", async (req) => {
    const user = req.user as { orgId: string };
    return app.prisma.user.findMany({
      where: { organizationId: user.orgId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  });

  app.post("/", async (req, reply) => {
    const auth = req.user as { orgId: string; role: string };
    if (auth.role !== "admin") return reply.status(403).send({ error: "Sadece admin kullanıcı ekleyebilir" });

    const data = userSchema.parse(req.body);
    const limits = await getTenantLimits(app);
    const org = await app.prisma.organization.findUnique({ where: { id: auth.orgId } });
    const userCount = await app.prisma.user.count({ where: { organizationId: auth.orgId, isActive: true } });

    if (org?.status === "TRIAL" && userCount >= limits.maxTrialUsers) {
      return reply.status(403).send({ error: `Deneme sürümünde en fazla ${limits.maxTrialUsers} kullanıcı eklenebilir` });
    }

    const exists = await app.prisma.user.findUnique({ where: { email: data.email } });
    if (exists) return reply.status(409).send({ error: "Bu e-posta zaten kayıtlı" });

    if (!data.password) return reply.status(400).send({ error: "Şifre zorunlu" });

    const passwordHash = await bcrypt.hash(data.password, 10);
    return app.prisma.user.create({
      data: {
        organizationId: auth.orgId,
        branchId: data.branchId,
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
      },
      select: { id: true, name: true, email: true, role: true, branchId: true, isActive: true },
    });
  });

  app.patch("/:id", async (req, reply) => {
    const auth = req.user as { orgId: string; role: string; sub: string };
    if (auth.role !== "admin") return reply.status(403).send({ error: "Sadece admin düzenleyebilir" });

    const { id } = req.params as { id: string };
    const data = userSchema.partial().extend({ isActive: z.boolean().optional() }).parse(req.body);

    const existing = await app.prisma.user.findFirst({ where: { id, organizationId: auth.orgId } });
    if (!existing) return reply.status(404).send({ error: "Kullanıcı bulunamadı" });
    if (id === auth.sub && data.isActive === false) {
      return reply.status(400).send({ error: "Kendi hesabınızı pasifleştiremezsiniz" });
    }

    const update: Record<string, unknown> = {};
    if (data.name) update.name = data.name;
    if (data.role) update.role = data.role;
    if (data.branchId !== undefined) update.branchId = data.branchId || null;
    if (data.isActive !== undefined) update.isActive = data.isActive;
    if (data.password) update.passwordHash = await bcrypt.hash(data.password, 10);

    return app.prisma.user.update({
      where: { id },
      data: update,
      select: { id: true, name: true, email: true, role: true, branchId: true, isActive: true },
    });
  });
}
