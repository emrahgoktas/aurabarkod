/** Örnek (sample) veri — gerçek müşteri / ödeme yok */

export const DEMO_USERS = [
  {
    id: "u-admin",
    email: "admin@aurabarkod.com",
    password: "admin123",
    name: "Emre Admin",
    role: "admin",
    branchId: "demo-branch",
  },
  {
    id: "u-cashier",
    email: "ayse.kasiyer@aurabarkod.com",
    password: "kasa123",
    name: "Ayşe Demir",
    role: "cashier",
    branchId: "demo-branch",
  },
  {
    id: "u-platform",
    email: "platform@aurabarkod.com",
    password: "platform123",
    name: "Platform Admin",
    role: "platform_admin",
    branchId: null as string | null,
  },
] as const;

export const DEMO_ORG = {
  id: "demo-org",
  slug: "yilmaz-market",
  name: "Yılmaz Market & Giyim",
  packageType: "MARKET",
  status: "ACTIVE",
};

export const DEMO_BRANCHES = [
  {
    id: "demo-branch",
    name: "Merkez Şube",
    address: "Kadıköy, İstanbul",
    phone: "02161234567",
    registers: [
      { id: "demo-register", name: "Kasa 1", code: "KASA-01" },
      { id: "demo-register-2", name: "Kasa 2", code: "KASA-02" },
    ],
  },
  {
    id: "demo-branch-2",
    name: "Şube 2 — Ataşehir",
    address: "Ataşehir, İstanbul",
    phone: "02169876543",
    registers: [{ id: "demo-register-3", name: "Kasa 1", code: "KASA-01" }],
  },
];

export const DEMO_CATEGORIES = [
  { id: "cat-gida", name: "Gıda" },
  { id: "cat-icecek", name: "İçecek" },
  { id: "cat-temizlik", name: "Temizlik" },
  { id: "cat-giyim", name: "Giyim" },
];

export const DEMO_PRODUCTS = [
  { id: "p1", name: "Ekmek", barcode: "8690000000001", price: 15, stock: 120, unit: "adet", categoryId: "cat-gida", taxRate: 1, imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100" },
  { id: "p2", name: "Süt 1L", barcode: "8690000000002", price: 45, stock: 60, unit: "adet", categoryId: "cat-gida", taxRate: 1, imageUrl: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=100" },
  { id: "p3", name: "Peynir (kg)", barcode: "2700001000005", price: 320, stock: 25, unit: "kg", isWeighted: true, categoryId: "cat-gida", taxRate: 1 },
  { id: "p4", name: "Zeytin (kg)", barcode: "2700002000012", price: 280, stock: 18, unit: "kg", isWeighted: true, categoryId: "cat-gida", taxRate: 1 },
  { id: "p5", name: "Su 1.5L", barcode: "8690000000004", price: 12, stock: 200, unit: "adet", categoryId: "cat-icecek", taxRate: 20, imageUrl: "https://images.unsplash.com/photo-1548839140-29a7492991f8?w=100" },
  { id: "p6", name: "Çikolata", barcode: "8690000000005", price: 35, stock: 90, unit: "adet", categoryId: "cat-gida", taxRate: 20, imageUrl: "https://images.unsplash.com/photo-1511381939415-e44015466834?w=100" },
  { id: "p7", name: "Makarna 500g", barcode: "8690000000010", price: 28, stock: 70, unit: "adet", categoryId: "cat-gida", taxRate: 1 },
  { id: "p8", name: "Zeytinyağı 1L", barcode: "8690000000011", price: 189, stock: 30, unit: "adet", categoryId: "cat-gida", taxRate: 1 },
  { id: "p9", name: "Deterjan 3kg", barcode: "8690000000012", price: 145, stock: 25, unit: "adet", categoryId: "cat-temizlik", taxRate: 20 },
  { id: "p10", name: "Yoğurt 1kg", barcode: "8690000000013", price: 55, stock: 45, unit: "adet", categoryId: "cat-gida", taxRate: 1, imageUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=100" },
  { id: "p11", name: "Kola 1L", barcode: "8690000000014", price: 38, stock: 80, unit: "adet", categoryId: "cat-icecek", taxRate: 20, imageUrl: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=100" },
  { id: "p12", name: "Çay 1kg", barcode: "8690000000015", price: 165, stock: 8, minStock: 15, unit: "adet", categoryId: "cat-gida", taxRate: 1 },
  { id: "p13", name: "Şeker 1kg", barcode: "8690000000016", price: 48, stock: 5, minStock: 20, unit: "adet", categoryId: "cat-gida", taxRate: 1 },
  { id: "p14", name: "Un 2kg", barcode: "8690000000017", price: 52, stock: 35, unit: "adet", categoryId: "cat-gida", taxRate: 1 },
  { id: "p15", name: "Sabun", barcode: "8690000000018", price: 22, stock: 100, unit: "adet", categoryId: "cat-temizlik", taxRate: 20 },
  { id: "p16", name: "Bulaşık Süngeri", barcode: "8690000000019", price: 18, stock: 60, unit: "adet", categoryId: "cat-temizlik", taxRate: 20 },
  { id: "p17", name: "Muz (kg)", barcode: "2700003000025", price: 95, stock: 30, unit: "kg", isWeighted: true, categoryId: "cat-gida", taxRate: 1 },
  { id: "p18", name: "Domates (kg)", barcode: "2700004000030", price: 45, stock: 40, unit: "kg", isWeighted: true, categoryId: "cat-gida", taxRate: 1 },
  { id: "p19", name: "Yumurta 30'lu", barcode: "8690000000020", price: 135, stock: 25, unit: "adet", categoryId: "cat-gida", taxRate: 1, imageUrl: "https://images.unsplash.com/photo-1587486913049-77fc59ddd871?w=100" },
  { id: "p20", name: "Ayran 1L", barcode: "8690000000021", price: 32, stock: 50, unit: "adet", categoryId: "cat-icecek", taxRate: 1, imageUrl: "https://images.unsplash.com/photo-1623065425991-007d65ce34a8?w=100" },
  {
    id: "p-tshirt",
    name: "Basic Tişört",
    barcode: "8690000000100",
    price: 299,
    stock: 0,
    hasVariants: true,
    unit: "adet",
    categoryId: "cat-giyim",
    taxRate: 20,
    variants: [
      { id: "v1", size: "S", color: "Beyaz", barcode: "8690000000101", stock: 12, price: 299 },
      { id: "v2", size: "M", color: "Beyaz", barcode: "8690000000102", stock: 18, price: 299 },
      { id: "v3", size: "L", color: "Siyah", barcode: "8690000000103", stock: 9, price: 299 },
      { id: "v4", size: "XL", color: "Lacivert", barcode: "8690000000104", stock: 6, price: 319 },
    ],
  },
  {
    id: "p-jeans",
    name: "Slim Fit Jean",
    barcode: "8690000000110",
    price: 599,
    stock: 0,
    hasVariants: true,
    unit: "adet",
    categoryId: "cat-giyim",
    taxRate: 20,
    variants: [
      { id: "v5", size: "30", color: "Mavi", barcode: "8690000000111", stock: 8, price: 599 },
      { id: "v6", size: "32", color: "Mavi", barcode: "8690000000112", stock: 10, price: 599 },
      { id: "v7", size: "34", color: "Siyah", barcode: "8690000000113", stock: 5, price: 649 },
    ],
  },
];

export const DEMO_SHORTCUTS = [
  { keySlot: 1, productId: "p1" },
  { keySlot: 2, productId: "p2" },
  { keySlot: 3, productId: "p5" },
  { keySlot: 4, productId: "p6" },
  { keySlot: 5, productId: "p20" },
  { keySlot: 6, productId: "p11" },
  { keySlot: 7, productId: "p19" },
  { keySlot: 8, productId: "p10" },
];

export const DEMO_CUSTOMERS = [
  { id: "c1", name: "Ahmet Yılmaz", phone: "05559876543", loyaltyPoints: 250, creditLimit: 5000, balance: 500, overdue: false },
  { id: "c2", name: "Fatma Kaya", phone: "05551112233", loyaltyPoints: 80, creditLimit: 3000, balance: 0, overdue: false },
  { id: "c3", name: "Mehmet Öz", phone: "05554445566", loyaltyPoints: 420, creditLimit: 8000, balance: 1250, overdue: true },
  { id: "c4", name: "Zeynep Arslan", phone: "05557778899", loyaltyPoints: 150, creditLimit: 2000, balance: 0, overdue: false },
  { id: "c5", name: "Hasan Çelik", phone: "05553334455", loyaltyPoints: 0, creditLimit: 1500, balance: 680, overdue: true },
];

export const DEMO_CAMPAIGNS = [
  {
    id: "camp1",
    name: "2 Al 1 Öde Çikolata",
    type: "BUY_X_GET_Y",
    value: 0,
    buyQuantity: 2,
    getQuantity: 1,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    isActive: true,
  },
  {
    id: "camp2",
    name: "Hafta Sonu %10 İndirim",
    type: "PERCENTAGE",
    value: 10,
    minAmount: 200,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    isActive: true,
  },
];

export const DEMO_RECEIPT = {
  storeName: "Yılmaz Market & Giyim",
  address: "Kadıköy, İstanbul",
  phone: "02161234567",
  taxNumber: "1234567890",
  taxOffice: "Kadıköy Vergi Dairesi",
  footerText: "DEMO FİŞ — gerçek ödeme yok. Bizi tercih ettiğiniz için teşekkürler!",
  paperWidth: "MM_80",
  fontScale: "normal",
  printerConnection: "USB",
  autoPrint: false,
  showTaxDetails: true,
  showCashierName: true,
};

export const DEMO_TEAM = [
  { id: "u-admin", name: "Emre Admin", email: "admin@aurabarkod.com", role: "admin", isActive: true, branchId: "demo-branch" },
  { id: "u-cashier", name: "Ayşe Demir", email: "ayse.kasiyer@aurabarkod.com", role: "cashier", isActive: true, branchId: "demo-branch" },
];

export const DEMO_SUPPLIERS = [
  { id: "sup1", name: "Metro Toptan", taxNumber: "9876543210", phone: "02165554433" },
];

export const DEMO_INVOICES = [
  {
    id: "inv1",
    invoiceNo: "MT-2026-001",
    total: 12500,
    createdAt: new Date().toISOString(),
    supplier: { name: "Metro Toptan" },
  },
];
