export type PackageType = "MARKET" | "RETAIL";

export type PaymentMethod = "CASH" | "CARD" | "QR" | "CREDIT";

export interface CartItem {
  productId: string;
  variantId?: string;
  name: string;
  barcode?: string;
  imageUrl?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  total: number;
}

export interface SalePayment {
  method: PaymentMethod;
  amount: number;
}

export interface SalePayload {
  branchId: string;
  registerId: string;
  customerId?: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  payments?: SalePayment[];
  offlineId?: string;
  digitalReceipt?: boolean;
  receiptEmail?: string;
  receiptPhone?: string;
}

export interface ScaleBarcodeResult {
  productCode: string;
  weightKg: number;
  totalPrice?: number;
}

export function parseScaleBarcode(barcode: string): ScaleBarcodeResult | null {
  if (!/^27\d{11}$/.test(barcode)) return null;
  const productCode = barcode.slice(2, 7);
  const weightGrams = parseInt(barcode.slice(7, 12), 10);
  return { productCode, weightKg: weightGrams / 1000 };
}

export function applyCampaigns(
  items: CartItem[],
  campaigns: Array<{
    type: string;
    value: number;
    buyQuantity?: number;
    getQuantity?: number;
    minAmount?: number;
  }>
): number {
  let totalDiscount = 0;
  const subtotal = items.reduce((s, i) => s + i.total, 0);

  for (const c of campaigns) {
    if (c.minAmount && subtotal < c.minAmount) continue;
    if (c.type === "PERCENTAGE") {
      totalDiscount += subtotal * (c.value / 100);
    } else if (c.type === "FIXED") {
      totalDiscount += c.value;
    } else if (c.type === "BUY_X_GET_Y" && c.buyQuantity && c.getQuantity) {
      const eligible = items.filter((i) => i.quantity >= c.buyQuantity!);
      for (const item of eligible) {
        const freeUnits = Math.floor(item.quantity / c.buyQuantity!) * c.getQuantity!;
        totalDiscount += freeUnits * item.unitPrice;
      }
    }
  }
  return Math.min(totalDiscount, subtotal);
}

export const MODULES = {
  COMMON: [
    "offline_sync",
    "backup",
    "csv_import",
    "efatura",
    "receipt_print",
    "multi_branch",
    "qr_payment",
    "accounting_export",
    "dashboard",
    "customers",
    "products",
    "returns",
    "z_report",
  ],
  MARKET: ["scale_barcode", "credit_account", "supplier_invoice", "shortcuts", "weighted_products", "low_stock"],
  RETAIL: ["variants", "campaigns", "loyalty", "label_print", "size_color"],
} as const;

export type ModuleId =
  | (typeof MODULES.MARKET)[number]
  | (typeof MODULES.RETAIL)[number]
  | (typeof MODULES.COMMON)[number];

export function hasModule(packageType: PackageType, module: ModuleId): boolean {
  const common = MODULES.COMMON as readonly string[];
  if (common.includes(module)) return true;
  return (MODULES[packageType] as readonly string[]).includes(module);
}

export const PACKAGE_LABELS: Record<PackageType, { title: string; subtitle: string }> = {
  MARKET: { title: "Market", subtitle: "Bakkal, market, şarküteri" },
  RETAIL: { title: "Giyim", subtitle: "Giyim, ayakkabı, aksesuar mağazası" },
};

export const PACKAGE_FEATURES: Record<PackageType, string[]> = {
  MARKET: ["Terazi barkod", "Veresiye / cari", "F1–F8 kısayollar", "Düşük stok uyarısı", "Tedarikçi faturası"],
  RETAIL: ["Beden / renk varyant", "Kampanya motoru", "Sadakat puanı", "Barkod etiket yazdır", "Sezon indirimi"],
};
