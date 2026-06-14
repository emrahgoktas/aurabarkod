export interface EInvoicePayload {
  saleId: string;
  receiptNo: string;
  total: number;
  tax: number;
  items: Array<{ name: string; quantity: number; unitPrice: number; taxRate: number; total: number }>;
  buyer?: { name?: string; taxNumber?: string };
  seller: { name: string; taxNumber?: string | null; taxOffice?: string | null };
}

export interface EInvoiceResult {
  uuid: string;
  status: "issued" | "pending" | "failed";
  provider: string;
  message: string;
  raw?: Record<string, unknown>;
}

export interface EInvoiceProvider {
  name: string;
  issue(payload: EInvoicePayload): Promise<EInvoiceResult>;
  checkStatus?(uuid: string): Promise<{ status: string; message?: string }>;
}
