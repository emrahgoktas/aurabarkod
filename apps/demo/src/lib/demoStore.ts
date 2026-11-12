import {
  DEMO_BRANCHES,
  DEMO_CAMPAIGNS,
  DEMO_CATEGORIES,
  DEMO_CUSTOMERS,
  DEMO_INVOICES,
  DEMO_ORG,
  DEMO_PRODUCTS,
  DEMO_RECEIPT,
  DEMO_SHORTCUTS,
  DEMO_SUPPLIERS,
  DEMO_TEAM,
  DEMO_USERS,
} from "./demoData";

const KEY = "aura_demo_v1";

export type DemoSale = {
  id: string;
  receiptNo: string;
  branchId: string;
  registerId: string;
  customerId?: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  items: Array<{
    id: string;
    productId?: string;
    name: string;
    barcode?: string;
    quantity: number;
    unitPrice: number;
    total: number;
    refunded?: boolean;
  }>;
  customer?: { name: string };
};

export type DemoState = {
  products: typeof DEMO_PRODUCTS;
  customers: typeof DEMO_CUSTOMERS;
  campaigns: typeof DEMO_CAMPAIGNS;
  sales: DemoSale[];
  receipt: typeof DEMO_RECEIPT;
  team: typeof DEMO_TEAM;
  suppliers: typeof DEMO_SUPPLIERS;
  invoices: typeof DEMO_INVOICES;
  categories: typeof DEMO_CATEGORIES;
  shortcuts: typeof DEMO_SHORTCUTS;
  saleSeq: number;
  backups: Array<{ id: string; createdAt: string; size: string }>;
  exports: Array<{ id: string; createdAt: string; format: string }>;
};

function seedSales(): DemoSale[] {
  const now = Date.now();
  const samples = [
    { items: [{ productId: "p1", qty: 3 }, { productId: "p2", qty: 2 }], method: "CASH" },
    { items: [{ productId: "p5", qty: 5 }], method: "CARD" },
    { items: [{ productId: "p6", qty: 4 }], method: "CASH" },
    { items: [{ productId: "p11", qty: 2 }, { productId: "p20", qty: 1 }], method: "QR" },
  ];
  return samples.map((s, i) => {
    const items = s.items.map((si, j) => {
      const p = DEMO_PRODUCTS.find((x) => x.id === si.productId)!;
      const total = p.price * si.qty;
      return {
        id: `si-${i}-${j}`,
        productId: p.id,
        name: p.name,
        barcode: p.barcode,
        quantity: si.qty,
        unitPrice: p.price,
        total,
      };
    });
    const subtotal = items.reduce((a, b) => a + b.total, 0);
    return {
      id: `sale-${i + 1}`,
      receiptNo: `R-DEMO-${1000 + i}`,
      branchId: "demo-branch",
      registerId: "demo-register",
      subtotal,
      discount: 0,
      tax: subtotal * 0.2,
      total: subtotal,
      paymentMethod: s.method,
      status: "COMPLETED",
      createdAt: new Date(now - (samples.length - i) * 3600000).toISOString(),
      items,
    };
  });
}

function defaultState(): DemoState {
  return {
    products: structuredClone(DEMO_PRODUCTS) as DemoState["products"],
    customers: structuredClone(DEMO_CUSTOMERS) as DemoState["customers"],
    campaigns: structuredClone(DEMO_CAMPAIGNS) as DemoState["campaigns"],
    sales: seedSales(),
    receipt: { ...DEMO_RECEIPT },
    team: structuredClone(DEMO_TEAM) as DemoState["team"],
    suppliers: structuredClone(DEMO_SUPPLIERS) as DemoState["suppliers"],
    invoices: structuredClone(DEMO_INVOICES) as DemoState["invoices"],
    categories: structuredClone(DEMO_CATEGORIES) as DemoState["categories"],
    shortcuts: structuredClone(DEMO_SHORTCUTS) as DemoState["shortcuts"],
    saleSeq: 1004,
    backups: [{ id: "bk1", createdAt: new Date().toISOString(), size: "2.4 MB" }],
    exports: [],
  };
}

export function loadState(): DemoState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = defaultState();
      saveState(s);
      return s;
    }
    return JSON.parse(raw) as DemoState;
  } catch {
    const s = defaultState();
    saveState(s);
    return s;
  }
}

export function saveState(state: DemoState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function resetDemoState() {
  localStorage.removeItem(KEY);
  return loadState();
}

export function findUser(email: string, password: string) {
  return DEMO_USERS.find((u) => u.email === email && u.password === password);
}

export function getOrg() {
  return DEMO_ORG;
}

export function getBranches() {
  return DEMO_BRANCHES;
}

export function tenantInfo() {
  return {
    status: "ACTIVE",
    trialExpiresAt: null,
    trialDaysLeft: 14,
    trialExpired: false,
    limits: { trialDays: 14, maxTrialUsers: 5, maxTrialProducts: 100 },
    usage: { users: DEMO_TEAM.length, products: DEMO_PRODUCTS.length },
  };
}

export function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
