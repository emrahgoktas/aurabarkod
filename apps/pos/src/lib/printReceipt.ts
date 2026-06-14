import type { CartItem, PaymentMethod } from "@aura/shared";

export type PaperWidth = "MM_58" | "MM_80";
export type FontScale = "small" | "normal" | "large";
export type PrinterConnection = "USB" | "ETHERNET" | "WIFI" | "BLUETOOTH";

export interface ReceiptSettings {
  storeName: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  taxNumber?: string | null;
  taxOffice?: string | null;
  mersisNo?: string | null;
  footerText?: string | null;
  paperWidth: PaperWidth;
  fontScale: FontScale;
  printerBrand?: string | null;
  printerModel?: string | null;
  printerConnection: PrinterConnection;
  autoPrint: boolean;
  showTaxDetails: boolean;
  showCashierName: boolean;
}

export interface ReceiptData {
  receiptNo: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount?: number;
  total: number;
  paymentMethod?: PaymentMethod;
  payments?: Array<{ method: PaymentMethod; amount: number }>;
  cashierName?: string;
  customerName?: string;
  createdAt?: Date;
}

const CACHE_KEY = "aura_receipt_settings";

export const PAPER_SPECS: Record<PaperWidth, { label: string; pageWidth: string; bodyWidth: string; baseFont: number; titleFont: number }> = {
  MM_58: { label: "58 mm", pageWidth: "58mm", bodyWidth: "52mm", baseFont: 9, titleFont: 11 },
  MM_80: { label: "80 mm", pageWidth: "80mm", bodyWidth: "74mm", baseFont: 11, titleFont: 14 },
};

const FONT_SCALE_MULT: Record<FontScale, number> = { small: 0.9, normal: 1, large: 1.15 };

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  CASH: "Nakit",
  CARD: "Kart",
  QR: "QR",
  CREDIT: "Veresiye",
};

export function cacheReceiptSettings(settings: ReceiptSettings) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(settings));
}

export function getCachedReceiptSettings(): ReceiptSettings | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) as ReceiptSettings : null;
  } catch {
    return null;
  }
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function generateReceiptHtml(settings: ReceiptSettings, data: ReceiptData): string {
  const spec = PAPER_SPECS[settings.paperWidth];
  const scale = FONT_SCALE_MULT[settings.fontScale];
  const base = Math.round(spec.baseFont * scale);
  const title = Math.round(spec.titleFont * scale);
  const dt = (data.createdAt || new Date()).toLocaleString("tr-TR");

  const itemRows = data.items.map((i) => {
    const qty = Number(i.quantity);
    const name = esc(i.name);
    const total = i.total.toFixed(2);
    if (settings.paperWidth === "MM_58") {
      return `<tr><td class="name">${name}</td></tr><tr><td class="qty-price">${qty} x ₺${i.unitPrice.toFixed(2)} <span class="right">₺${total}</span></td></tr>`;
    }
    return `<tr><td class="name">${name}</td><td class="qty">${qty}</td><td class="price">₺${total}</td></tr>`;
  }).join("");

  const paymentBlock = data.payments && data.payments.length > 1
    ? data.payments.map((p) => `<div class="row"><span>${PAYMENT_LABELS[p.method]}</span><span>₺${p.amount.toFixed(2)}</span></div>`).join("")
    : `<div class="row"><span>Ödeme</span><span>${PAYMENT_LABELS[data.paymentMethod || "CASH"]}</span></div>`;

  const taxBlock = settings.showTaxDetails
    ? `<div class="row"><span>Ara Toplam</span><span>₺${data.subtotal.toFixed(2)}</span></div>
       ${data.discount ? `<div class="row"><span>İndirim</span><span>-₺${data.discount.toFixed(2)}</span></div>` : ""}
       <div class="row"><span>KDV</span><span>₺${data.tax.toFixed(2)}</span></div>`
    : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Fiş ${esc(data.receiptNo)}</title>
<style>
  @page { size: ${spec.pageWidth} auto; margin: 2mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: ${spec.bodyWidth};
    font-family: "Courier New", Courier, monospace;
    font-size: ${base}px;
    line-height: 1.35;
    color: #000;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .store { font-size: ${title}px; font-weight: bold; margin-bottom: 2px; }
  .meta { font-size: ${base - 1}px; margin-bottom: 1px; }
  .sep { border: none; border-top: 1px dashed #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 1px 0; vertical-align: top; }
  .name { font-weight: bold; }
  .qty { text-align: center; width: 12%; }
  .price { text-align: right; width: 22%; }
  .qty-price { font-size: ${base - 1}px; }
  .right { float: right; }
  .total { font-size: ${title}px; font-weight: bold; margin-top: 4px; }
  .footer { text-align: center; font-size: ${base - 1}px; margin-top: 8px; }
  @media print { body { width: ${spec.bodyWidth}; } }
</style></head><body>
  <div class="center store">${esc(settings.storeName)}</div>
  ${settings.address ? `<div class="center meta">${esc(settings.address)}</div>` : ""}
  ${settings.phone ? `<div class="center meta">Tel: ${esc(settings.phone)}</div>` : ""}
  ${settings.taxNumber ? `<div class="center meta">VKN: ${esc(settings.taxNumber)}</div>` : ""}
  ${settings.taxOffice ? `<div class="center meta">V.D.: ${esc(settings.taxOffice)}</div>` : ""}
  ${settings.mersisNo ? `<div class="center meta">MERSİS: ${esc(settings.mersisNo)}</div>` : ""}
  <hr class="sep" />
  <div class="row"><span>Fiş No</span><span>${esc(data.receiptNo)}</span></div>
  <div class="row"><span>Tarih</span><span>${dt}</span></div>
  ${settings.showCashierName && data.cashierName ? `<div class="row"><span>Kasiyer</span><span>${esc(data.cashierName)}</span></div>` : ""}
  ${data.customerName ? `<div class="row"><span>Müşteri</span><span>${esc(data.customerName)}</span></div>` : ""}
  <hr class="sep" />
  <table>
    ${settings.paperWidth === "MM_80" ? "<tr><td class='bold'>Ürün</td><td class='bold qty'>Adet</td><td class='bold price'>Tutar</td></tr>" : ""}
    ${itemRows}
  </table>
  <hr class="sep" />
  ${taxBlock}
  <div class="row total"><span>TOPLAM</span><span>₺${data.total.toFixed(2)}</span></div>
  <hr class="sep" />
  ${paymentBlock}
  ${settings.footerText ? `<div class="footer">${esc(settings.footerText)}</div>` : ""}
  ${settings.website ? `<div class="footer">${esc(settings.website)}</div>` : ""}
</body></html>`;
}

export function printReceipt(settings: ReceiptSettings, data: ReceiptData) {
  if (!settings.autoPrint && !data.receiptNo.startsWith("TEST")) return;

  if (settings.printerBrand) {
    import("./escpos").then(({ printReceiptEscPos, supportsWebSerial, buildEscPosReceipt, downloadEscPosFile }) => {
      printReceiptEscPos(settings, data).catch(() => {
        if (!supportsWebSerial()) {
          downloadEscPosFile(buildEscPosReceipt(settings, data), `fis-${data.receiptNo}.bin`);
        }
      });
    });
    return;
  }

  const html = generateReceiptHtml(settings, data);
  const width = settings.paperWidth === "MM_58" ? 220 : 302;
  const win = window.open("", "_blank", `width=${width},height=640`);
  if (!win) return;
  win.document.write(html);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); }, 350);
}

export const DEFAULT_RECEIPT_SETTINGS: ReceiptSettings = {
  storeName: "Mağaza",
  paperWidth: "MM_80",
  fontScale: "normal",
  printerConnection: "USB",
  autoPrint: true,
  showTaxDetails: true,
  showCashierName: true,
  footerText: "Bizi tercih ettiğiniz için teşekkürler!",
};
