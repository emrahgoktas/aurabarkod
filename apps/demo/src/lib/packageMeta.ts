import type { PackageType } from "./shared";

export const PACKAGE_LABELS: Record<PackageType, { title: string; subtitle: string }> = {
  MARKET: { title: "Market", subtitle: "Bakkal, market, şarküteri" },
  RETAIL: { title: "Giyim", subtitle: "Giyim, ayakkabı, aksesuar mağazası" },
};

export const PACKAGE_FEATURES: Record<PackageType, string[]> = {
  MARKET: ["Terazi barkod", "Veresiye / cari", "F1–F8 kısayollar", "Düşük stok uyarısı", "Tedarikçi faturası"],
  RETAIL: ["Beden / renk varyant", "Kampanya motoru", "Sadakat puanı", "Barkod etiket yazdır", "Sezon indirimi"],
};
