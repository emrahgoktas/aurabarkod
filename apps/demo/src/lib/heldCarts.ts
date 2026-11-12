import type { CartItem } from "./shared";

export interface HeldCart {
  id: string;
  label: string;
  items: CartItem[];
  customerId?: string;
  heldAt: string;
}

const KEY = "aura_held_carts";

export function getHeldCarts(): HeldCart[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as HeldCart[];
  } catch {
    return [];
  }
}

export function holdCart(items: CartItem[], customerId?: string, label?: string): HeldCart {
  const carts = getHeldCarts();
  const entry: HeldCart = {
    id: `hold-${Date.now()}`,
    label: label || `Sepet ${carts.length + 1}`,
    items,
    customerId,
    heldAt: new Date().toISOString(),
  };
  carts.unshift(entry);
  localStorage.setItem(KEY, JSON.stringify(carts.slice(0, 10)));
  return entry;
}

export function removeHeldCart(id: string) {
  localStorage.setItem(KEY, JSON.stringify(getHeldCarts().filter((c) => c.id !== id)));
}
