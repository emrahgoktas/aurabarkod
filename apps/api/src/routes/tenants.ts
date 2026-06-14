import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { PACKAGE_FEATURES } from "@aura/shared";
import { getTenantLimits } from "../lib/tenant";

const registerSchema = z.object({
  packageType: z.enum(["MARKET", "RETAIL"]),
  organizationName: z.string().min(2),
  slug: z.string().min(3).max(48).regex(/^[a-z0-9-]+$/, "Slug sadece küçük harf, rakam ve tire içerebilir").optional(),
  email: z.string().email().optional(),
  taxNumber: z.string().min(10).max(11).optional(),
  taxOffice: z.string().min(2).optional(),
  mersisNo: z.string().optional(),
  branchName: z.string().min(1).default("Merkez Şube"),
  address: z.string().optional(),
  phone: z.string().optional(),
  adminName: z.string().min(2),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(6),
});

const MARKET_CATEGORIES = ["Gıda", "İçecek", "Temizlik"];
const RETAIL_CATEGORIES = ["Giyim", "Aksesuar", "Ayakkabı"];

function slugify(name: string): string {
  const map: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", Ç: "c", Ğ: "g", İ: "i", Ö: "o", Ş: "s", Ü: "u" };
  const base = name
    .split("")
    .map((c) => map[c] || c)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "tenant"}-${Date.now().toString(36).slice(-4)}`;
}

async function uniqueSlug(prisma: FastifyInstance["prisma"], preferred?: string, fallbackName?: string) {
  let slug = preferred || slugify(fallbackName || "tenant");
  let attempt = 0;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    attempt++;
    slug = `${(preferred || slugify(fallbackName || "tenant")).slice(0, 36)}-${attempt}`;
  }
  return slug;
}

export async function tenantRoutes(app: FastifyInstance) {
  /** SaaS: platform her zaman hazır; yeni tenant kaydı her zaman açık */
  app.get("/status", async () => {
    const [tenantCount, platform] = await Promise.all([
      app.prisma.organization.count(),
      app.prisma.platformConfig.findUnique({ where: { id: "aura-platform" } }),
    ]);
    return {
      multiTenant: true,
      platformName: platform?.name || "Aura Barkod",
      tenantCount,
      canRegister: true,
    };
  });

  app.get("/check-slug", async (req, reply) => {
    const slug = (req.query as { slug?: string }).slug?.trim().toLowerCase();
    if (!slug || !/^[a-z0-9-]{3,48}$/.test(slug)) {
      return reply.status(400).send({ error: "Geçersiz slug" });
    }
    const exists = await app.prisma.organization.findUnique({ where: { slug } });
    return { slug, available: !exists };
  });

  app.get("/resolve/:slug", async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const org = await app.prisma.organization.findUnique({
      where: { slug: slug.toLowerCase() },
      select: { id: true, slug: true, name: true, packageType: true, status: true },
    });
    if (!org) return reply.status(404).send({ error: "Tenant bulunamadı" });
    const platform = await app.prisma.platformConfig.findUnique({ where: { id: "aura-platform" } });
    const domain = platform?.domain || "aurabarkod.com";
    return {
      tenant: org,
      tenantUrl: `${org.slug}.${domain}`,
      loginUrl: `/login?tenant=${org.slug}`,
    };
  });

  app.post("/register", async (req, reply) => {
    const body = registerSchema.parse(req.body);

    const emailExists = await app.prisma.user.findUnique({ where: { email: body.adminEmail } });
    if (emailExists) {
      return reply.status(409).send({ error: "Bu e-posta adresi zaten kayıtlı" });
    }

    const slug = await uniqueSlug(app.prisma, body.slug?.toLowerCase(), body.organizationName);
    const passwordHash = await bcrypt.hash(body.adminPassword, 10);
    const limits = await getTenantLimits(app);
    const trialExpiresAt = new Date();
    trialExpiresAt.setDate(trialExpiresAt.getDate() + limits.trialDays);

    await app.prisma.platformConfig.upsert({
      where: { id: "aura-platform" },
      update: {},
      create: { id: "aura-platform", name: "Aura Barkod" },
    });

    const result = await app.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          slug,
          name: body.organizationName,
          email: body.email || body.adminEmail,
          phone: body.phone || null,
          address: body.address || null,
          taxNumber: body.taxNumber || null,
          taxOffice: body.taxOffice || null,
          mersisNo: body.mersisNo || null,
          packageType: body.packageType,
          status: "TRIAL",
          trialExpiresAt,
          setupCompletedAt: new Date(),
        },
      });

      const branch = await tx.branch.create({
        data: {
          organizationId: org.id,
          name: body.branchName,
          address: body.address || null,
          phone: body.phone || null,
        },
      });

      const register = await tx.cashRegister.create({
        data: { branchId: branch.id, name: "Kasa 1", code: "KASA-1" },
      });

      const admin = await tx.user.create({
        data: {
          organizationId: org.id,
          branchId: branch.id,
          email: body.adminEmail,
          passwordHash,
          name: body.adminName,
          role: "admin",
        },
      });

      await tx.receiptSettings.create({
        data: {
          organizationId: org.id,
          storeName: body.organizationName,
          address: body.address || null,
          phone: body.phone || null,
          taxNumber: body.taxNumber || null,
          taxOffice: body.taxOffice || null,
          paperWidth: "MM_80",
        },
      });

      const cats = body.packageType === "MARKET" ? MARKET_CATEGORIES : RETAIL_CATEGORIES;
      for (const name of cats) {
        await tx.category.create({ data: { organizationId: org.id, name } });
      }

      await tx.tenantSubscription.create({
        data: { organizationId: org.id, plan: "TRIAL", monthlyPrice: 0 },
      });

      return { org, branch, register, admin };
    });

    const token = app.jwt.sign({
      sub: result.admin.id,
      orgId: result.org.id,
      branchId: result.branch.id,
      role: result.admin.role,
    });

    return {
      token,
      tenant: {
        id: result.org.id,
        slug: result.org.slug,
        name: result.org.name,
        packageType: result.org.packageType,
        status: result.org.status,
        trialExpiresAt: result.org.trialExpiresAt,
        trialDaysLeft: limits.trialDays,
        trialExpired: false,
        limits,
        usage: { users: 1, products: 0 },
      },
      user: {
        id: result.admin.id,
        name: result.admin.name,
        email: result.admin.email,
        role: result.admin.role,
        organization: {
          id: result.org.id,
          slug: result.org.slug,
          name: result.org.name,
          packageType: result.org.packageType,
          status: result.org.status,
        },
      },
      branchId: result.branch.id,
      registerId: result.register.id,
      modules: PACKAGE_FEATURES[body.packageType],
      message: `Tenant oluşturuldu — ${body.packageType === "MARKET" ? "Market" : "Giyim"} modülü aktif`,
    };
  });
}
