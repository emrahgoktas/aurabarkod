import { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireTenant, verifyBranchBelongsToOrg } from "../lib/tenant";

export async function branchRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);
  app.addHook("onRequest", requireTenant);

  app.get("/", async (req) => {
    const user = req.user as { orgId: string };
    return app.prisma.branch.findMany({
      where: { organizationId: user.orgId, isActive: true },
      include: { registers: { where: { isActive: true }, orderBy: { code: "asc" } } },
      orderBy: { name: "asc" },
    });
  });

  app.post("/", async (req, reply) => {
    const user = req.user as { orgId: string; role: string };
    if (user.role === "cashier") return reply.status(403).send({ error: "Yetkisiz" });

    const data = z
      .object({ name: z.string().min(1), address: z.string().optional(), phone: z.string().optional() })
      .parse(req.body);

    const branch = await app.prisma.branch.create({
      data: { ...data, organizationId: user.orgId },
    });

    const register = await app.prisma.cashRegister.create({
      data: { branchId: branch.id, name: "Kasa 1", code: "KASA-1" },
    });

    return { ...branch, registers: [register] };
  });

  app.post("/:branchId/registers", async (req, reply) => {
    const user = req.user as { orgId: string; role: string };
    if (user.role === "cashier") return reply.status(403).send({ error: "Yetkisiz" });

    const { branchId } = req.params as { branchId: string };
    const branch = await verifyBranchBelongsToOrg(app, branchId, user.orgId);
    if (!branch) return reply.status(404).send({ error: "Şube bulunamadı" });

    const data = z.object({ name: z.string().min(1), code: z.string().min(1) }).parse(req.body);
    return app.prisma.cashRegister.create({
      data: { branchId, ...data },
    });
  });
}
