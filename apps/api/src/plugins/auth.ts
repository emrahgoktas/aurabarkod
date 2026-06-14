import { FastifyInstance } from "fastify";

export function registerAuthHook(app: FastifyInstance) {
  app.decorate("authenticate", async (req: any, reply: any) => {
    try {
      await req.jwtVerify();
    } catch {
      reply.status(401).send({ error: "Yetkisiz erişim" });
    }
  });
}
