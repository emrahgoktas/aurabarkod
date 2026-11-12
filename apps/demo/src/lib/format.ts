/** Prisma Decimal / API string sayıları güvenle formatlar */
export function toNum(v: number | string | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

export function formatMoney(v: number | string | null | undefined, decimals = 2): string {
  return toNum(v).toFixed(decimals);
}
