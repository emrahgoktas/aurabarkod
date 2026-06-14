import { FastifyInstance } from "fastify";
import { parse } from "csv-parse/sync";

export async function importRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.post("/products/csv", async (req, reply) => {
    const user = req.user as { orgId: string };
    const data = await req.file();
    if (!data) return reply.status(400).send({ error: "CSV dosyası gerekli" });

    const buffer = await data.toBuffer();
    const records = parse(buffer, { columns: true, skip_empty_lines: true, trim: true }) as Array<Record<string, string>>;

    let imported = 0;
    let errors: string[] = [];

    for (const row of records) {
      try {
        const barcode = row.barcode || row.Barkod || row.BARCODE;
        const name = row.name || row.Ürün || row.Name || row.urun;
        const price = parseFloat(row.price || row.Fiyat || row.PRICE || "0");
        const stock = parseFloat(row.stock || row.Stok || row.STOCK || "0");
        const unit = row.unit || row.Birim || "adet";

        if (!name || !barcode) {
          errors.push(`Eksik satır: ${JSON.stringify(row)}`);
          continue;
        }

        await app.prisma.product.upsert({
          where: { organizationId_barcode: { organizationId: user.orgId, barcode } },
          update: { name, price, stock, unit },
          create: { organizationId: user.orgId, name, barcode, price, stock, unit },
        });
        imported++;
      } catch (e) {
        errors.push(String(e));
      }
    }

    return { imported, errors: errors.slice(0, 10), total: records.length };
  });
}
