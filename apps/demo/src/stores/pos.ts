import { create } from "zustand";
import type { CartItem, PaymentMethod } from "../lib/shared";
import { setTenantSlug } from "../lib/api";

interface TenantInfo {
  status: string;
  trialExpiresAt?: string | null;
  trialDaysLeft: number;
  trialExpired: boolean;
  limits: { trialDays: number; maxTrialUsers: number; maxTrialProducts: number };
  usage: { users: number; products: number };
}

interface AuthState {
  token: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    organization: {
      id: string;
      slug?: string;
      name: string;
      packageType: string;
      status?: string;
    } | null;
  } | null;
  tenant: TenantInfo | null;
  branchId: string;
  registerId: string;
  setAuth: (token: string, user: AuthState["user"], tenant?: TenantInfo | null) => void;
  logout: () => void;
  setRegister: (branchId: string, registerId: string) => void;
  setWorkspace: (token: string, branchId: string, registerId: string) => void;
  setTenant: (tenant: TenantInfo | null) => void;
}

interface CartState {
  items: CartItem[];
  customerId?: string;
  addItem: (item: CartItem) => void;
  removeItem: (index: number) => void;
  updateQty: (index: number, qty: number) => void;
  clear: () => void;
  setCustomer: (id?: string) => void;
  loadCart: (items: CartItem[], customerId?: string) => void;
  subtotal: () => number;
  tax: () => number;
  total: () => number;
}

export const useAuth = create<AuthState>((set) => ({
  token: localStorage.getItem("aura_token"),
  user: JSON.parse(localStorage.getItem("aura_user") || "null"),
  tenant: JSON.parse(localStorage.getItem("aura_tenant") || "null"),
  branchId: localStorage.getItem("aura_branch") || "",
  registerId: localStorage.getItem("aura_register") || "",
  setAuth: (token, user, tenant = null) => {
    localStorage.setItem("aura_token", token);
    localStorage.setItem("aura_user", JSON.stringify(user));
    if (tenant) localStorage.setItem("aura_tenant", JSON.stringify(tenant));
    setTenantSlug(user?.organization?.slug ?? null);
    set({ token, user, tenant: tenant ?? null });
  },
  logout: () => {
    localStorage.removeItem("aura_token");
    localStorage.removeItem("aura_user");
    localStorage.removeItem("aura_tenant");
    localStorage.removeItem("aura_branch");
    localStorage.removeItem("aura_register");
    setTenantSlug(null);
    set({ token: null, user: null, tenant: null, branchId: "", registerId: "" });
  },
  setRegister: (branchId, registerId) => {
    localStorage.setItem("aura_branch", branchId);
    localStorage.setItem("aura_register", registerId);
    set({ branchId, registerId });
  },
  setWorkspace: (token, branchId, registerId) => {
    localStorage.setItem("aura_token", token);
    localStorage.setItem("aura_branch", branchId);
    localStorage.setItem("aura_register", registerId);
    set({ token, branchId, registerId });
  },
  setTenant: (tenant) => {
    if (tenant) localStorage.setItem("aura_tenant", JSON.stringify(tenant));
    else localStorage.removeItem("aura_tenant");
    set({ tenant });
  },
}));

export const useCart = create<CartState>((set, get) => ({
  items: [],
  customerId: undefined,
  addItem: (item) => set((s) => {
    const idx = s.items.findIndex((i) => i.productId === item.productId && i.variantId === item.variantId);
    if (idx >= 0) {
      const items = [...s.items];
      items[idx] = { ...items[idx], quantity: items[idx].quantity + item.quantity, total: (items[idx].quantity + item.quantity) * items[idx].unitPrice };
      return { items };
    }
    return { items: [...s.items, item] };
  }),
  removeItem: (index) => set((s) => ({ items: s.items.filter((_, i) => i !== index) })),
  updateQty: (index, qty) => set((s) => {
    const items = [...s.items];
    items[index] = { ...items[index], quantity: qty, total: qty * items[index].unitPrice };
    return { items };
  }),
  clear: () => set({ items: [], customerId: undefined }),
  setCustomer: (id) => set({ customerId: id }),
  loadCart: (items, customerId) => set({ items, customerId }),
  subtotal: () => get().items.reduce((s, i) => s + i.total, 0),
  tax: () => get().items.reduce((s, i) => s + i.total * (i.taxRate / 100), 0),
  total: () => get().subtotal(),
}));

export type { PaymentMethod };
