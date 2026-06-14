import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";

const legacySchema = z.object({
  packageType: z.enum(["MARKET", "RETAIL"]),
  organizationName: z.string().min(2),
  taxNumber: z.string().optional(),
  taxOffice: z.string().optional(),
  branchName: z.string().min(1).default("Merkez Şube"),
  address: z.string().optional(),
  phone: z.string().optional(),
  adminName: z.string().min(2),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(6),
});

/** Geriye dönük uyumluluk — yeni kayıtlar /api/tenants/register kullanır */
export async function setupRoutes(app: FastifyInstance) {
  app.get("/status", async () => {
    const tenantCount = await app.prisma.organization.count();
    return {
      needsSetup: false,
      multiTenant: true,
      tenantCount,
      canRegister: true,
    };
  });

  app.post("/", async (req, reply) => {
    const body = legacySchema.parse(req.body);
    const res = await app.inject({
      method: "POST",
      url: "/api/tenants/register",
      payload: { ...body, email: body.adminEmail },
    });
    reply.status(res.statusCode).send(res.json());
  });
}
