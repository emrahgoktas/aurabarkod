import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import { PrismaClient } from "@prisma/client";
import { authRoutes } from "./routes/auth";
import { productRoutes } from "./routes/products";
import { saleRoutes } from "./routes/sales";
import { customerRoutes } from "./routes/customers";
import { reportRoutes } from "./routes/reports";
import { syncRoutes } from "./routes/sync";
import { importRoutes } from "./routes/import";
import { backupRoutes } from "./routes/backup";
import { campaignRoutes } from "./routes/campaigns";
import { branchRoutes } from "./routes/branches";
import { efaturaRoutes } from "./routes/efatura";
import { accountingRoutes } from "./routes/accounting";
import { receiptRoutes } from "./routes/receipt";
import { setupRoutes } from "./routes/setup";
import { tenantRoutes } from "./routes/tenants";
import { platformRoutes } from "./routes/platform";
import { userRoutes } from "./routes/users";
import { supplierRoutes } from "./routes/suppliers";
import { billingRoutes, platformBillingRoutes } from "./routes/billing";
import { registerAuthHook } from "./plugins/auth";

const prisma = new PrismaClient();

const app = Fastify({ logger: true });

app.decorate("prisma", prisma);
registerAuthHook(app);

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

async function start() {
  await app.register(cors, { origin: true });
  await app.register(jwt, { secret: process.env.JWT_SECRET || "dev-secret" });
  await app.register(multipart);

  app.get("/health", async () => ({ status: "ok", service: "aura-barkod-api" }));

  await app.register(setupRoutes, { prefix: "/api/setup" });
  await app.register(tenantRoutes, { prefix: "/api/tenants" });
  await app.register(platformRoutes, { prefix: "/api/platform" });

  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(productRoutes, { prefix: "/api/products" });
  await app.register(saleRoutes, { prefix: "/api/sales" });
  await app.register(customerRoutes, { prefix: "/api/customers" });
  await app.register(reportRoutes, { prefix: "/api/reports" });
  await app.register(syncRoutes, { prefix: "/api/sync" });
  await app.register(importRoutes, { prefix: "/api/import" });
  await app.register(backupRoutes, { prefix: "/api/backup" });
  await app.register(campaignRoutes, { prefix: "/api/campaigns" });
  await app.register(branchRoutes, { prefix: "/api/branches" });
  await app.register(userRoutes, { prefix: "/api/users" });
  await app.register(supplierRoutes, { prefix: "/api/suppliers" });
  await app.register(efaturaRoutes, { prefix: "/api/efatura" });
  await app.register(accountingRoutes, { prefix: "/api/accounting" });
  await app.register(receiptRoutes, { prefix: "/api/receipt" });
  await app.register(billingRoutes, { prefix: "/api/billing" });
  await app.register(platformBillingRoutes, { prefix: "/api/platform" });

  const port = Number(process.env.API_PORT) || 4000;
  await app.listen({ port, host: "0.0.0.0" });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
