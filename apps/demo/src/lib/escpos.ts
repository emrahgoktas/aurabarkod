import type { ReceiptSettings, ReceiptData } from "./printReceipt";

export type PrinterProfile = "GENERIC" | "EPSON" | "STAR" | "BIXOLON";

export const PRINTER_PROFILES: Record<PrinterProfile, { label: string; brands: string[] }> = {
  GENERIC: { label: "Genel ESC/POS", brands: ["Xprinter", "Hoin", "Generic"] },
  EPSON: { label: "Epson TM Serisi", brands: ["Epson", "TM-T20", "TM-T88"] },
  STAR: { label: "Star Micronics", brands: ["Star", "TSP100", "TSP650"] },
  BIXOLON: { label: "Bixolon", brands: ["Bixolon", "SRP-350", "SPP-R200"] },
};

const ESC = 0x1b;
const GS = 0x1d;

function detectProfile(settings: ReceiptSettings): PrinterProfile {
  const brand = (settings.printerBrand || "").toLowerCase();
  if (brand.includes("epson") || brand.includes("tm-t")) return "EPSON";
  if (brand.includes("star") || brand.includes("tsp")) return "STAR";
  if (brand.includes("bixolon") || brand.includes("srp") || brand.includes("spp")) return "BIXOLON";
  return "GENERIC";
}

function encoder(): { bytes: number[]; add: (...n: number[]) => void; text: (s: string) => void; cmd: (s: string) => void } {
  const bytes: number[] = [];
  return {
    bytes,
    add(...n) { bytes.push(...n); },
    text(s: string) {
      for (let i = 0; i < s.length; i++) bytes.push(s.charCodeAt(i) & 0xff);
      bytes.push(0x0a);
    },
    cmd(s: string) {
      for (let i = 0; i < s.length; i++) bytes.push(s.charCodeAt(i));
    },
  };
}

function initPrinter(e: ReturnType<typeof encoder>, profile: PrinterProfile) {
  e.cmd("\x1b\x40");
  if (profile === "EPSON") {
    e.add(ESC, 0x74, 0x00);
  }
}

function settingsAlignCenter(e: ReturnType<typeof encoder>) {
  e.add(ESC, 0x61, 0x01);
}

function settingsAlignLeft(e: ReturnType<typeof encoder>) {
  e.add(ESC, 0x61, 0x00);
}

function boldOn(e: ReturnType<typeof encoder>) {
  e.add(ESC, 0x45, 0x01);
}

function boldOff(e: ReturnType<typeof encoder>) {
  e.add(ESC, 0x45, 0x00);
}

function doubleSizeOn(e: ReturnType<typeof encoder>) {
  e.add(GS, 0x21, 0x11);
}

function doubleSizeOff(e: ReturnType<typeof encoder>) {
  e.add(GS, 0x21, 0x00);
}

function cut(e: ReturnType<typeof encoder>) {
  e.add(GS, 0x56, 0x00);
}

function row(e: ReturnType<typeof encoder>, left: string, right: string, width: number) {
  const gap = width - left.length - right.length;
  const pad = gap > 0 ? " ".repeat(gap) : " ";
  e.text(`${left}${pad}${right}`);
}

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Nakit",
  CARD: "Kart",
  QR: "QR",
  CREDIT: "Veresiye",
};

export function buildEscPosReceipt(settings: ReceiptSettings, data: ReceiptData): Uint8Array {
  const profile = detectProfile(settings);
  const e = encoder();
  const cols = settings.paperWidth === "MM_58" ? 32 : 48;

  initPrinter(e, profile);

  settingsAlignCenter(e);
  boldOn(e);
  if (settings.fontScale === "large") doubleSizeOn(e);
  e.text(settings.storeName);
  if (settings.fontScale === "large") doubleSizeOff(e);
  boldOff(e);

  if (settings.address) e.text(settings.address);
  if (settings.phone) e.text(`Tel: ${settings.phone}`);
  if (settings.taxNumber) e.text(`VKN: ${settings.taxNumber}`);
  if (settings.taxOffice) e.text(`V.D.: ${settings.taxOffice}`);
  if (settings.mersisNo) e.text(`MERSIS: ${settings.mersisNo}`);

  e.text("-".repeat(cols));
  settingsAlignLeft(e);

  const dt = (data.createdAt || new Date()).toLocaleString("tr-TR");
  row(e, "Fis No", data.receiptNo, cols);
  row(e, "Tarih", dt, cols);
  if (settings.showCashierName && data.cashierName) row(e, "Kasiyer", data.cashierName.slice(0, 12), cols);
  if (data.customerName) row(e, "Musteri", data.customerName.slice(0, 12), cols);

  e.text("-".repeat(cols));

  for (const item of data.items) {
    const name = item.name.slice(0, cols);
    e.text(name);
    const line = `${item.quantity} x ${item.unitPrice.toFixed(2)}`;
    row(e, line, `${item.total.toFixed(2)} TL`, cols);
  }

  e.text("-".repeat(cols));

  if (settings.showTaxDetails) {
    row(e, "Ara Toplam", `${data.subtotal.toFixed(2)} TL`, cols);
    if (data.discount) row(e, "Indirim", `-${data.discount.toFixed(2)} TL`, cols);
    row(e, "KDV", `${data.tax.toFixed(2)} TL`, cols);
  }

  boldOn(e);
  row(e, "TOPLAM", `${data.total.toFixed(2)} TL`, cols);
  boldOff(e);

  e.text("-".repeat(cols));

  if (data.payments && data.payments.length > 1) {
    for (const p of data.payments) {
      row(e, PAYMENT_LABELS[p.method] || p.method, `${p.amount.toFixed(2)} TL`, cols);
    }
  } else {
    row(e, "Odeme", PAYMENT_LABELS[data.paymentMethod || "CASH"] || "Nakit", cols);
  }

  if (settings.footerText) {
    e.text("-".repeat(cols));
    settingsAlignCenter(e);
    e.text(settings.footerText);
  }
  if (settings.website) e.text(settings.website);

  e.text("");
  e.text("");
  cut(e);

  return new Uint8Array(e.bytes);
}

export function supportsWebSerial(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

let cachedPort: { writable?: WritableStream<Uint8Array> | null } | null = null;

export async function connectSerialPrinter() {
  if (!supportsWebSerial()) throw new Error("Bu tarayıcı USB seri yazıcıyı desteklemiyor (Chrome/Edge kullanın)");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const port = await (navigator as any).serial.requestPort();
  await port.open({ baudRate: 9600 });
  cachedPort = port;
  return port;
}

export async function printEscPosRaw(data: Uint8Array, port?: { writable?: WritableStream<Uint8Array> | null } | null): Promise<void> {
  const activePort = port || cachedPort;
  if (!activePort?.writable) {
    downloadEscPosFile(data, "aura-fis.bin");
    throw new Error("Yazıcı bağlı değil — ESC/POS dosyası indirildi");
  }
  const writer = activePort.writable.getWriter();
  try {
    await writer.write(data);
  } finally {
    writer.releaseLock();
  }
}

export function downloadEscPosFile(data: Uint8Array, filename = "aura-receipt.bin") {
  const blob = new Blob([new Uint8Array(data)], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function printReceiptEscPos(settings: ReceiptSettings, data: ReceiptData): Promise<"serial" | "download" | "skipped"> {
  if (!settings.autoPrint && !data.receiptNo.startsWith("TEST")) return "skipped";
  const bytes = buildEscPosReceipt(settings, data);

  if (settings.printerConnection === "USB" && supportsWebSerial() && cachedPort) {
    await printEscPosRaw(bytes, cachedPort);
    return "serial";
  }

  if (settings.printerBrand) {
    downloadEscPosFile(bytes, `fis-${data.receiptNo}.bin`);
    return "download";
  }

  return "skipped";
}

export function getPrinterProfileLabel(settings: ReceiptSettings): string {
  return PRINTER_PROFILES[detectProfile(settings)].label;
}
