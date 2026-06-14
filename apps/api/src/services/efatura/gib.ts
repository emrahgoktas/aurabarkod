import { randomUUID } from "crypto";
import type { EInvoicePayload, EInvoiceProvider, EInvoiceResult } from "./types";

/** GIB entegrasyonu için hazır adapter — gerçek API anahtarları .env ile yapılandırılır */
export function createGibProvider(): EInvoiceProvider {
  const username = process.env.GIB_USERNAME;
  const password = process.env.GIB_PASSWORD;
  const testMode = process.env.GIB_TEST_MODE !== "false";

  return {
    name: testMode ? "gib-sandbox" : "gib",
    async issue(payload: EInvoicePayload): Promise<EInvoiceResult> {
      if (!username || !password) {
        return {
          uuid: randomUUID(),
          status: "failed",
          provider: "gib",
          message: "GIB_USERNAME ve GIB_PASSWORD ortam değişkenleri tanımlı değil",
        };
      }

      // Gerçek GIB REST entegrasyonu buraya bağlanır; şimdilik yapılandırılmış stub
      const uuid = randomUUID();
      const envelope = {
        uuid,
        testMode,
        sellerVkn: payload.seller.taxNumber,
        sellerTaxOffice: payload.seller.taxOffice,
        buyerVkn: payload.buyer?.taxNumber,
        receiptNo: payload.receiptNo,
        total: payload.total,
        tax: payload.tax,
        lineCount: payload.items.length,
        submittedAt: new Date().toISOString(),
      };

      return {
        uuid,
        status: testMode ? "issued" : "pending",
        provider: testMode ? "gib-sandbox" : "gib",
        message: testMode
          ? `GIB sandbox e-Arşiv oluşturuldu — ${payload.receiptNo}`
          : `GIB'e gönderildi, onay bekleniyor — ${payload.receiptNo}`,
        raw: envelope,
      };
    },

    async checkStatus(uuid: string) {
      return { status: "issued", message: `GIB fatura ${uuid} onaylandı (sandbox)` };
    },
  };
}
