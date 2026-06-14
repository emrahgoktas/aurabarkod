export type ImageSize = "sm" | "md" | "lg";

const IMAGE_SIZE_KEY = "aura_image_size";
const ALERTS_DISMISS_KEY = "aura_alerts_dismissed";

export const IMAGE_SIZES: Record<ImageSize, { shortcut: string; cart: string; hero: string; label: string }> = {
  sm: { shortcut: "w-8 h-8", cart: "w-8 h-8", hero: "w-16 h-16", label: "Küçük" },
  md: { shortcut: "w-12 h-12", cart: "w-10 h-10", hero: "w-24 h-24", label: "Orta" },
  lg: { shortcut: "w-16 h-16", cart: "w-14 h-14", hero: "w-32 h-32", label: "Büyük" },
};

export function getImageSize(): ImageSize {
  const v = localStorage.getItem(IMAGE_SIZE_KEY);
  return v === "sm" || v === "lg" ? v : "md";
}

export function setImageSize(size: ImageSize) {
  localStorage.setItem(IMAGE_SIZE_KEY, size);
}

export function isAlertsDismissed(type: "overdue" | "upcoming" | "all"): boolean {
  try {
    const raw = localStorage.getItem(ALERTS_DISMISS_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw) as { until: number; types: string[] };
    if (Date.now() > data.until) {
      localStorage.removeItem(ALERTS_DISMISS_KEY);
      return false;
    }
    return data.types.includes("all") || data.types.includes(type);
  } catch {
    return false;
  }
}

export function dismissAlerts(hours = 24, type: "overdue" | "upcoming" | "all" = "all") {
  const existing = (() => {
    try {
      const raw = localStorage.getItem(ALERTS_DISMISS_KEY);
      if (raw) return JSON.parse(raw).types as string[];
    } catch { /* */ }
    return [];
  })();
  const types = type === "all" ? ["all"] : [...new Set([...existing.filter((t) => t !== "all"), type])];
  localStorage.setItem(ALERTS_DISMISS_KEY, JSON.stringify({
    until: Date.now() + hours * 60 * 60 * 1000,
    types,
  }));
}

export function clearAlertsDismiss() {
  localStorage.removeItem(ALERTS_DISMISS_KEY);
}
