import { randomUUID } from "crypto";
import type { EInvoicePayload, EInvoiceProvider, EInvoiceResult } from "./types";

export const mockProvider: EInvoiceProvider = {
  name: "mock",
  async issue(payload: EInvoicePayload): Promise<EInvoiceResult> {
    return {
      uuid: randomUUID(),
      status: "issued",
      provider: "mock",
      message: `Mock e-Fatura oluşturuldu — ${payload.receiptNo}`,
      raw: { mode: "mock", itemCount: payload.items.length, total: payload.total },
    };
  },
};
