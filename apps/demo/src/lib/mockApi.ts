import {
  findUser,
  getBranches,
  getOrg,
  loadState,
  saveState,
  tenantInfo,
  uid,
  type DemoSale,
  type DemoState,
} from "./demoStore";
import { parseScaleBarcode } from "./shared";

function ok<T>(data: T): T {
  return data;
}

function fail(message: string): never {
  throw new Error(message);
}

function withState<T>(fn: (s: DemoState) => T): T {
  const s = loadState();
  const result = fn(s);
  saveState(s);
  return result;
}

function productByBarcode(s: DemoState, code: string) {
  const scale = parseScaleBarcode(code);
  if (scale) {
    // Terazi: PLU eşlemesi örnek — 00001 → peynir vb. yerine barkodda gömülü ürün araması
    const weighted = s.products.find((p) => p.isWeighted && p.barcode?.startsWith("27"));
    // Daha doğru: seed barkodlarının productCode kısmı
    const match = s.products.find((p) => {
      if (!p.isWeighted || !p.barcode) return false;
      const plu = p.barcode.slice(2, 7);
      return plu === scale.productCode;
    });
    const product = match || weighted;
    if (!product) return null;
    const qty = scale.weightKg;
    return {
      ...product,
      scaleWeight: qty,
      calculatedPrice: Number(product.price) * qty,
      quantity: qty,
    };
  }

  for (const p of s.products) {
    if (p.barcode === code) return p;
    const variants = (p as { variants?: Array<{ id: string; barcode: string; size?: string; color?: string; price: number; stock: number }> }).variants;
    if (variants) {
      const v = variants.find((x) => x.barcode === code);
      if (v) {
        return {
          ...p,
          price: v.price,
          stock: v.stock,
          barcode: v.barcode,
          selectedVariant: { id: v.id, size: v.size, color: v.color },
        };
      }
    }
  }
  return null;
}

function dashboard(s: DemoState, period: string) {
  const sales = s.sales.filter((x) => x.status === "COMPLETED");
  const revenue = sales.reduce((a, b) => a + b.total, 0);
  const payments = { cash: 0, card: 0, qr: 0, credit: 0 };
  for (const sale of sales) {
    if (sale.paymentMethod === "CASH") payments.cash += sale.total;
    else if (sale.paymentMethod === "CARD") payments.card += sale.total;
    else if (sale.paymentMethod === "QR") payments.qr += sale.total;
    else if (sale.paymentMethod === "CREDIT") payments.credit += sale.total;
  }
  const productMap = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const sale of sales) {
    for (const item of sale.items) {
      const cur = productMap.get(item.name) || { name: item.name, qty: 0, revenue: 0 };
      cur.qty += item.quantity;
      cur.revenue += item.total;
      productMap.set(item.name, cur);
    }
  }
  const topProducts = [...productMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const trend = Array.from({ length: period === "yearly" ? 6 : 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const daySales = sales.filter((x) => x.createdAt.slice(0, 10) === d.toISOString().slice(0, 10));
    return {
      date: d.toISOString().slice(0, 10),
      revenue: daySales.reduce((a, b) => a + b.total, 0),
      count: daySales.length,
    };
  });
  const overdue = s.customers.filter((c) => c.overdue || c.balance > 0);
  return {
    period,
    periodLabel: period === "daily" ? "Bugün" : period === "monthly" ? "Bu ay" : "Bu yıl",
    revenue,
    saleCount: sales.length,
    avgBasket: sales.length ? revenue / sales.length : 0,
    payments,
    topProducts,
    productCount: s.products.length,
    customerCount: s.customers.length,
    lowStockCount: s.products.filter((p) => Number(p.stock) <= Number((p as { minStock?: number }).minStock || 10)).length,
    overdueCount: overdue.filter((c) => c.overdue).length,
    totalCreditBalance: s.customers.reduce((a, c) => a + c.balance, 0),
    trend,
  };
}

function zReport(s: DemoState, registerId?: string) {
  const sales = s.sales.filter(
    (x) => x.status === "COMPLETED" && (!registerId || x.registerId === registerId)
  );
  const refunds = s.sales.filter((x) => x.status === "REFUNDED");
  const sum = (method: string) => sales.filter((x) => x.paymentMethod === method).reduce((a, b) => a + b.total, 0);
  return {
    totalSales: sales.reduce((a, b) => a + b.total, 0),
    saleCount: sales.length,
    cashTotal: sum("CASH"),
    cardTotal: sum("CARD"),
    qrTotal: sum("QR"),
    creditTotal: sum("CREDIT"),
    totalRefunds: refunds.reduce((a, b) => a + b.total, 0),
  };
}

export async function mockApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  await new Promise((r) => setTimeout(r, 80 + Math.random() * 120));
  const method = (options.method || "GET").toUpperCase();
  const body = options.body ? JSON.parse(String(options.body)) : null;
  const [pathname, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  const parts = pathname.replace(/^\//, "").split("/");

  // AUTH
  if (pathname === "/auth/login" && method === "POST") {
    const user = findUser(body.email, body.password);
    if (!user) fail("E-posta veya şifre hatalı (demo: admin@aurabarkod.com / admin123)");
    const org = getOrg();
    const branches = getBranches();
    if (user.role === "platform_admin") {
      return ok({
        token: "demo-platform-token",
        user: { id: user.id, name: user.name, email: user.email, role: user.role, organization: null },
        session: { branchId: null, registerId: null, branches: [], tenant: null },
      }) as T;
    }
    return ok({
      token: `demo-token-${user.id}`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: org,
      },
      session: {
        branchId: user.branchId,
        registerId: user.role === "cashier" ? "demo-register" : null,
        branches,
        tenant: tenantInfo(),
      },
    }) as T;
  }

  if (pathname === "/auth/workspace" && method === "POST") {
    return ok({
      token: `demo-ws-${body.branchId}-${body.registerId}`,
      branchId: body.branchId,
      registerId: body.registerId,
    }) as T;
  }

  if (pathname.startsWith("/tenants/resolve/")) {
    return ok({ tenant: { name: getOrg().name, slug: getOrg().slug } }) as T;
  }

  if (pathname === "/tenants/check-slug") {
    return ok({ available: params.get("slug") !== "yilmaz-market" }) as T;
  }

  // PRODUCTS
  if (pathname === "/products/categories") {
    return ok(loadState().categories) as T;
  }

  if (pathname === "/products/low-stock") {
    const s = loadState();
    return ok(s.products.filter((p) => Number(p.stock) <= Number((p as { minStock?: number }).minStock || 10))) as T;
  }

  if (pathname.startsWith("/products/shortcuts/")) {
    const s = loadState();
    return ok(
      s.shortcuts.map((sc) => ({
        keySlot: sc.keySlot,
        product: s.products.find((p) => p.id === sc.productId),
      })).filter((x) => x.product)
    ) as T;
  }

  if (pathname.startsWith("/products/barcode/")) {
    const code = decodeURIComponent(pathname.replace("/products/barcode/", ""));
    const product = productByBarcode(loadState(), code);
    if (!product) fail("Ürün bulunamadı");
    return ok(product) as T;
  }

  if (pathname === "/products" && method === "GET") {
    const s = loadState();
    const search = (params.get("search") || "").toLowerCase();
    let list = s.products as Array<Record<string, unknown>>;
    if (search) {
      list = list.filter(
        (p) =>
          String(p.name).toLowerCase().includes(search) ||
          String(p.barcode || "").includes(search)
      );
    }
    return ok(list) as T;
  }

  if (pathname === "/products" && method === "POST") {
    return withState((s) => {
      const id = uid("p");
      const product = { id, taxRate: 20, stock: 0, unit: "adet", ...body };
      (s.products as unknown[]).push(product);
      return ok(product) as T;
    });
  }

  if (parts[0] === "products" && parts[1] && method === "PUT") {
    return withState((s) => {
      const idx = s.products.findIndex((p) => p.id === parts[1]);
      if (idx < 0) fail("Ürün yok");
      s.products[idx] = { ...s.products[idx], ...body };
      return ok(s.products[idx]) as T;
    });
  }

  if (parts[0] === "products" && parts[1] && parts[2] === "price" && method === "PATCH") {
    return withState((s) => {
      const p = s.products.find((x) => x.id === parts[1]);
      if (!p) fail("Ürün yok");
      (p as { price: number }).price = Number(body.price);
      return ok(p) as T;
    });
  }

  if (parts[0] === "products" && parts[1] && method === "DELETE" && !parts[2]) {
    return withState((s) => {
      s.products = s.products.filter((p) => p.id !== parts[1]) as DemoState["products"];
      return ok({ ok: true }) as T;
    });
  }

  if (pathname === "/products/bulk-price" && method === "POST") {
    return withState((s) => {
      let updated = 0;
      for (const p of s.products) {
        if (body.categoryId && p.categoryId !== body.categoryId) continue;
        const price = Number(p.price);
        if (body.mode === "percent") (p as { price: number }).price = +(price * (1 + body.value / 100)).toFixed(2);
        else (p as { price: number }).price = price + Number(body.value);
        updated++;
      }
      return ok({ updated, message: `${updated} ürün güncellendi (demo)` }) as T;
    });
  }

  if (parts[0] === "products" && parts[2] === "variants" && method === "POST") {
    return withState((s) => {
      const p = s.products.find((x) => x.id === parts[1]) as { variants?: unknown[] } | undefined;
      if (!p) fail("Ürün yok");
      if (!p.variants) p.variants = [];
      const v = { id: uid("v"), ...body };
      p.variants.push(v);
      return ok(v) as T;
    });
  }

  if (parts[0] === "products" && parts[2] === "variants" && parts[3] && method === "DELETE") {
    return withState((s) => {
      const p = s.products.find((x) => x.id === parts[1]) as { variants?: Array<{ id: string }> } | undefined;
      if (!p?.variants) fail("Varyant yok");
      p.variants = p.variants.filter((v) => v.id !== parts[3]);
      return ok({ ok: true }) as T;
    });
  }

  // SALES
  if (pathname === "/sales" && method === "POST") {
    return withState((s) => {
      s.saleSeq += 1;
      const receiptNo = `R-DEMO-${s.saleSeq}`;
      const sale: DemoSale = {
        id: uid("sale"),
        receiptNo,
        branchId: body.branchId,
        registerId: body.registerId,
        customerId: body.customerId,
        subtotal: body.subtotal,
        discount: body.discount || 0,
        tax: body.tax,
        total: body.total,
        paymentMethod: body.paymentMethod,
        status: "COMPLETED",
        createdAt: new Date().toISOString(),
        items: (body.items || []).map((it: Record<string, unknown>, i: number) => ({
          id: `si-${s.saleSeq}-${i}`,
          productId: it.productId as string,
          name: it.name as string,
          barcode: it.barcode as string | undefined,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          total: Number(it.total),
        })),
        customer: body.customerId
          ? { name: s.customers.find((c) => c.id === body.customerId)?.name || "Müşteri" }
          : undefined,
      };
      s.sales.unshift(sale);
      for (const it of sale.items) {
        const p = s.products.find((x) => x.id === it.productId);
        if (p && !p.isWeighted) (p as { stock: number }).stock = Math.max(0, Number(p.stock) - it.quantity);
      }
      if (body.paymentMethod === "CREDIT" && body.customerId) {
        const c = s.customers.find((x) => x.id === body.customerId);
        if (c) c.balance += body.total;
      }
      return ok({ receiptNo, id: sale.id }) as T;
    });
  }

  if (pathname.startsWith("/sales/recent")) {
    const registerId = params.get("registerId");
    const limit = Number(params.get("limit") || 15);
    const s = loadState();
    return ok(
      s.sales
        .filter((x) => !registerId || x.registerId === registerId)
        .slice(0, limit)
    ) as T;
  }

  if (parts[0] === "sales" && parts[2] === "refund" && method === "POST") {
    return withState((s) => {
      const sale = s.sales.find((x) => x.id === parts[1]);
      if (!sale) fail("Satış yok");
      sale.status = "REFUNDED";
      sale.items = sale.items.map((i) => ({ ...i, refunded: true }));
      return ok(sale) as T;
    });
  }

  if (parts[0] === "sales" && parts[2] === "refund-items" && method === "POST") {
    return withState((s) => {
      const sale = s.sales.find((x) => x.id === parts[1]);
      if (!sale) fail("Satış yok");
      const ids = new Set(body.saleItemIds as string[]);
      sale.items = sale.items.map((i) => (ids.has(i.id) ? { ...i, refunded: true } : i));
      if (sale.items.every((i) => i.refunded)) sale.status = "REFUNDED";
      return ok(sale) as T;
    });
  }

  // CUSTOMERS
  if (pathname === "/customers/alerts") {
    const s = loadState();
    const overdue = s.customers
      .filter((c) => c.overdue)
      .map((c) => ({
        customerId: c.id,
        name: c.name,
        balance: c.balance,
        dueDate: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10),
        daysOverdue: 3,
      }));
    const upcoming = s.customers
      .filter((c) => !c.overdue && c.balance > 0)
      .map((c) => ({
        customerId: c.id,
        name: c.name,
        balance: c.balance,
        dueDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
        daysLeft: 2,
      }));
    return ok({
      overdueCount: overdue.length,
      upcomingCount: upcoming.length,
      overdue,
      upcoming,
      totalCreditBalance: s.customers.reduce((a, c) => a + c.balance, 0),
    }) as T;
  }

  if (pathname === "/customers" && method === "GET") {
    const s = loadState();
    const search = (params.get("search") || "").toLowerCase();
    const debtOnly = params.get("debtOnly") === "1";
    let list = s.customers.map((c) => ({
      ...c,
      account: { creditLimit: c.creditLimit, balance: c.balance },
    }));
    if (search) list = list.filter((c) => c.name.toLowerCase().includes(search) || c.phone.includes(search));
    if (debtOnly) list = list.filter((c) => c.balance > 0);
    return ok(list) as T;
  }

  if (pathname === "/customers" && method === "POST") {
    return withState((s) => {
      const c = {
        id: uid("c"),
        name: body.name,
        phone: body.phone || "",
        loyaltyPoints: 0,
        creditLimit: Number(body.creditLimit || 0),
        balance: 0,
        overdue: false,
      };
      (s.customers as unknown[]).push(c);
      return ok(c) as T;
    });
  }

  if (parts[0] === "customers" && parts[1] && method === "PUT" && !parts[2]) {
    return withState((s) => {
      const idx = s.customers.findIndex((c) => c.id === parts[1]);
      if (idx < 0) fail("Müşteri yok");
      s.customers[idx] = { ...s.customers[idx], ...body };
      return ok(s.customers[idx]) as T;
    });
  }

  if (parts[0] === "customers" && parts[2] === "payment" && method === "POST") {
    return withState((s) => {
      const c = s.customers.find((x) => x.id === parts[1]);
      if (!c) fail("Müşteri yok");
      c.balance = Math.max(0, c.balance - Number(body.amount));
      if (c.balance === 0) c.overdue = false;
      return ok({ ok: true, balance: c.balance }) as T;
    });
  }

  if (parts[0] === "customers" && parts[2] === "promise" && method === "POST") {
    return ok({ ok: true }) as T;
  }

  if (parts[0] === "customers" && parts[2] === "ledger") {
    const s = loadState();
    const c = s.customers.find((x) => x.id === parts[1]);
    if (!c) fail("Müşteri yok");
    return ok({
      customer: c,
      account: { creditLimit: c.creditLimit, balance: c.balance },
      entries: [
        { id: "e1", type: "SALE", amount: c.balance || 100, note: "Örnek satış", createdAt: new Date().toISOString() },
        { id: "e2", type: "PAYMENT", amount: 50, note: "Örnek tahsilat", createdAt: new Date(Date.now() - 86400000).toISOString() },
      ],
    }) as T;
  }

  // CAMPAIGNS
  if (pathname === "/campaigns" && method === "GET") return ok(loadState().campaigns) as T;
  if (pathname === "/campaigns/roi") {
    return ok([
      { campaignId: "camp1", name: "2 Al 1 Öde Çikolata", sales: 12, revenue: 420, discount: 140 },
      { campaignId: "camp2", name: "Hafta Sonu %10 İndirim", sales: 8, revenue: 1860, discount: 186 },
    ]) as T;
  }
  if (pathname === "/campaigns" && method === "POST") {
    return withState((s) => {
      const c = { id: uid("camp"), isActive: true, ...body };
      (s.campaigns as unknown[]).push(c);
      return ok(c) as T;
    });
  }
  if (parts[0] === "campaigns" && parts[1] && method === "PUT") {
    return withState((s) => {
      const idx = s.campaigns.findIndex((c) => c.id === parts[1]);
      if (idx < 0) fail("Kampanya yok");
      s.campaigns[idx] = { ...s.campaigns[idx], ...body };
      return ok(s.campaigns[idx]) as T;
    });
  }
  if (parts[0] === "campaigns" && parts[1] && method === "DELETE") {
    return withState((s) => {
      s.campaigns = s.campaigns.filter((c) => c.id !== parts[1]) as DemoState["campaigns"];
      return ok({ ok: true }) as T;
    });
  }

  // REPORTS
  if (pathname.startsWith("/reports/dashboard")) {
    return ok(dashboard(loadState(), params.get("period") || "daily")) as T;
  }
  if (pathname === "/reports/z-report" && method === "POST") {
    return ok(zReport(loadState(), body?.registerId)) as T;
  }
  if (pathname.startsWith("/reports/z-report/")) {
    return ok(zReport(loadState(), pathname.split("/").pop())) as T;
  }

  // RECEIPT
  if (pathname === "/receipt/settings" && method === "GET") return ok(loadState().receipt) as T;
  if (pathname === "/receipt/settings" && (method === "PUT" || method === "POST" || method === "PATCH")) {
    return withState((s) => {
      s.receipt = { ...s.receipt, ...body };
      return ok(s.receipt) as T;
    });
  }

  // USERS / BRANCHES / SUPPLIERS / BACKUP / BILLING / EFATURA
  if (pathname === "/users" && method === "GET") return ok(loadState().team) as T;
  if (pathname === "/users" && method === "POST") {
    return withState((s) => {
      const u = { id: uid("u"), isActive: true, ...body };
      (s.team as unknown[]).push(u);
      return ok(u) as T;
    });
  }
  if (parts[0] === "users" && parts[1] && method === "PATCH") {
    return withState((s) => {
      const u = s.team.find((x) => x.id === parts[1]);
      if (!u) fail("Kullanıcı yok");
      Object.assign(u, body);
      return ok(u) as T;
    });
  }

  if (pathname === "/branches" && method === "GET") {
    return ok(
      getBranches().map((b) => ({
        id: b.id,
        name: b.name,
        address: b.address,
        phone: b.phone,
        registers: b.registers,
      }))
    ) as T;
  }
  if (pathname === "/branches" && method === "POST") {
    return ok({ id: uid("b"), ...body, registers: [] }) as T;
  }

  if (pathname === "/suppliers" && method === "GET") return ok(loadState().suppliers) as T;
  if (pathname === "/suppliers" && method === "POST") {
    return withState((s) => {
      const sup = { id: uid("sup"), ...body };
      (s.suppliers as unknown[]).push(sup);
      return ok(sup) as T;
    });
  }
  if (pathname === "/suppliers/invoices" && method === "GET") return ok(loadState().invoices) as T;
  if (pathname === "/suppliers/invoices" && method === "POST") {
    return withState((s) => {
      const inv = {
        id: uid("inv"),
        invoiceNo: body.invoiceNo,
        total: Number(body.total || 0),
        createdAt: new Date().toISOString(),
        supplier: { name: s.suppliers.find((x) => x.id === body.supplierId)?.name || "Tedarikçi" },
      };
      (s.invoices as unknown[]).push(inv);
      return ok(inv) as T;
    });
  }

  if (pathname === "/backup/list") return ok(loadState().backups) as T;
  if (pathname === "/backup/create" && method === "POST") {
    return withState((s) => {
      const backup = { id: uid("bk"), createdAt: new Date().toISOString(), size: "2.5 MB" };
      s.backups.unshift(backup);
      return ok({ backup }) as T;
    });
  }

  if (pathname === "/accounting/exports") return ok(loadState().exports) as T;
  if (pathname === "/accounting/export" && method === "POST") {
    return withState((s) => {
      const exp = { id: uid("ex"), createdAt: new Date().toISOString(), format: body.format || "logo" };
      s.exports.unshift(exp);
      return ok(exp) as T;
    });
  }

  if (pathname === "/billing/subscription") {
    return ok({
      plan: "PRO",
      monthlyPrice: 999,
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
    }) as T;
  }

  if (pathname === "/efatura/config") {
    return ok({ provider: "mock", enabled: true, message: "Demo modunda e-Fatura mock" }) as T;
  }

  if (pathname === "/platform/overview") {
    return ok({
      stats: { tenants: 1, activeUsers: 2, salesToday: loadState().sales.length, mrr: 999 },
    }) as T;
  }
  if (pathname === "/platform/tenants") {
    return ok([
      {
        id: getOrg().id,
        name: getOrg().name,
        slug: getOrg().slug,
        status: "ACTIVE",
        packageType: "MARKET",
        plan: "PRO",
      },
    ]) as T;
  }
  if (parts[0] === "platform" && parts[1] === "tenants" && method === "PATCH") {
    return ok({ ok: true }) as T;
  }

  // Setup register — demo'da gerçek kayıt yok
  if (pathname === "/setup/register" || pathname === "/tenants/register") {
    fail("Canlı demoda yeni işletme kaydı kapalı. Demo hesaplarıyla giriş yapın.");
  }

  console.warn("[demo mock] unhandled", method, path);
  fail(`Demo API: desteklenmeyen uç ${method} ${path}`);
}
