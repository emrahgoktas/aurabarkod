import { PrismaClient, PackageType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.platformConfig.upsert({
    where: { id: "aura-platform" },
    update: { name: "Aura Barkod", trialDays: 14, maxTrialUsers: 5, maxTrialProducts: 100 },
    create: { id: "aura-platform", name: "Aura Barkod", trialDays: 14, maxTrialUsers: 5, maxTrialProducts: 100 },
  });

  const platformHash = await bcrypt.hash("platform123", 10);
  await prisma.user.upsert({
    where: { email: "platform@aurabarkod.com" },
    update: { passwordHash: platformHash, name: "Platform Admin", role: "platform_admin", organizationId: null },
    create: {
      email: "platform@aurabarkod.com",
      passwordHash: platformHash,
      name: "Platform Admin",
      role: "platform_admin",
      organizationId: null,
    },
  });

  // Temiz başlangıç — bağımlı kayıtları sırayla sil
  const existing = await prisma.organization.findUnique({ where: { id: "demo-org" } });
  if (existing) {
    await prisma.zReport.deleteMany({ where: { branch: { organizationId: "demo-org" } } });
    await prisma.eInvoiceRecord.deleteMany({ where: { sale: { branch: { organizationId: "demo-org" } } } });
    await prisma.loyaltyLog.deleteMany({ where: { customer: { organizationId: "demo-org" } } });
    await prisma.creditEntry.deleteMany({ where: { account: { customer: { organizationId: "demo-org" } } } });
    await prisma.sale.deleteMany({ where: { branch: { organizationId: "demo-org" } } });
    await prisma.productShortcut.deleteMany({ where: { branch: { organizationId: "demo-org" } } });
    await prisma.purchaseInvoice.deleteMany({ where: { supplier: { organizationId: "demo-org" } } });
    await prisma.backupLog.deleteMany({ where: { organizationId: "demo-org" } });
    await prisma.receiptSettings.deleteMany({ where: { organizationId: "demo-org" } });
    await prisma.accountingExport.deleteMany({ where: { organizationId: "demo-org" } });
    await prisma.organization.delete({ where: { id: "demo-org" } });
  }

  const trialExpires = new Date();
  trialExpires.setDate(trialExpires.getDate() + 14);

  const org = await prisma.organization.create({
    data: {
      id: "demo-org",
      slug: "yilmaz-market",
      name: "Yılmaz Market & Giyim",
      email: "info@yilmazmarket.com",
      phone: "02161234567",
      address: "Kadıköy, İstanbul",
      taxNumber: "1234567890",
      taxOffice: "Kadıköy Vergi Dairesi",
      packageType: PackageType.MARKET,
      status: "ACTIVE",
      trialExpiresAt: trialExpires,
      setupCompletedAt: new Date(),
    },
  });

  await prisma.receiptSettings.create({
    data: {
      organizationId: org.id,
      storeName: "Yılmaz Market & Giyim",
      address: "Kadıköy, İstanbul",
      phone: "02161234567",
      taxNumber: "1234567890",
      taxOffice: "Kadıköy Vergi Dairesi",
      footerText: "Bizi tercih ettiğiniz için teşekkürler! İade 14 gün içinde.",
      paperWidth: "MM_80",
      fontScale: "normal",
      printerConnection: "USB",
      autoPrint: true,
      showTaxDetails: true,
      showCashierName: true,
    },
  });

  await prisma.tenantSubscription.create({
    data: {
      organizationId: org.id,
      plan: "PRO",
      monthlyPrice: 999,
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
    },
  });

  const branchMerkez = await prisma.branch.create({
    data: {
      id: "demo-branch",
      organizationId: org.id,
      name: "Merkez Şube",
      address: "Kadıköy, İstanbul",
      phone: "02161234567",
    },
  });

  const branchSube2 = await prisma.branch.create({
    data: {
      id: "demo-branch-2",
      organizationId: org.id,
      name: "Şube 2 — Ataşehir",
      address: "Ataşehir, İstanbul",
      phone: "02169876543",
    },
  });

  const register1 = await prisma.cashRegister.create({
    data: { id: "demo-register", branchId: branchMerkez.id, name: "Kasa 1", code: "KASA-01" },
  });

  await prisma.cashRegister.create({
    data: { id: "demo-register-2", branchId: branchMerkez.id, name: "Kasa 2", code: "KASA-02" },
  });

  await prisma.cashRegister.create({
    data: { id: "demo-register-3", branchId: branchSube2.id, name: "Kasa 1", code: "KASA-01" },
  });

  const adminHash = await bcrypt.hash("admin123", 10);
  const cashierHash = await bcrypt.hash("kasa123", 10);

  await prisma.user.create({
    data: {
      organizationId: org.id,
      branchId: branchMerkez.id,
      email: "admin@aurabarkod.com",
      passwordHash: adminHash,
      name: "Emre Admin",
      role: "admin",
    },
  });

  await prisma.user.create({
    data: {
      organizationId: org.id,
      branchId: branchMerkez.id,
      email: "ayse.kasiyer@aurabarkod.com",
      passwordHash: cashierHash,
      name: "Ayşe Demir",
      role: "cashier",
    },
  });

  const catGida = await prisma.category.create({ data: { organizationId: org.id, name: "Gıda" } });
  const catIcecek = await prisma.category.create({ data: { organizationId: org.id, name: "İçecek" } });
  const catTemizlik = await prisma.category.create({ data: { organizationId: org.id, name: "Temizlik" } });
  const catGiyim = await prisma.category.create({ data: { organizationId: org.id, name: "Giyim" } });

  const marketProducts = [
    { name: "Ekmek", barcode: "8690000000001", price: 15, stock: 120, unit: "adet", categoryId: catGida.id, imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100" },
    { name: "Süt 1L", barcode: "8690000000002", price: 45, stock: 60, unit: "adet", categoryId: catGida.id, imageUrl: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=100" },
    { name: "Peynir (kg)", barcode: "2700001000005", price: 320, stock: 25, unit: "kg", isWeighted: true, categoryId: catGida.id },
    { name: "Zeytin (kg)", barcode: "2700002000012", price: 280, stock: 18, unit: "kg", isWeighted: true, categoryId: catGida.id },
    { name: "Su 1.5L", barcode: "8690000000004", price: 12, stock: 200, unit: "adet", categoryId: catIcecek.id, imageUrl: "https://images.unsplash.com/photo-1548839140-29a7492991f8?w=100" },
    { name: "Çikolata", barcode: "8690000000005", price: 35, stock: 90, unit: "adet", categoryId: catGida.id, imageUrl: "https://images.unsplash.com/photo-1511381939415-e44015466834?w=100" },
    { name: "Makarna 500g", barcode: "8690000000010", price: 28, stock: 70, unit: "adet", categoryId: catGida.id },
    { name: "Zeytinyağı 1L", barcode: "8690000000011", price: 189, stock: 30, unit: "adet", categoryId: catGida.id },
    { name: "Deterjan 3kg", barcode: "8690000000012", price: 145, stock: 25, unit: "adet", categoryId: catTemizlik.id },
    { name: "Yoğurt 1kg", barcode: "8690000000013", price: 55, stock: 45, unit: "adet", categoryId: catGida.id, imageUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=100" },
    { name: "Kola 1L", barcode: "8690000000014", price: 38, stock: 80, unit: "adet", categoryId: catIcecek.id, imageUrl: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=100" },
    { name: "Çay 1kg", barcode: "8690000000015", price: 165, stock: 8, minStock: 15, unit: "adet", categoryId: catGida.id },
    { name: "Şeker 1kg", barcode: "8690000000016", price: 48, stock: 5, minStock: 20, unit: "adet", categoryId: catGida.id },
    { name: "Un 2kg", barcode: "8690000000017", price: 52, stock: 35, unit: "adet", categoryId: catGida.id },
    { name: "Sabun", barcode: "8690000000018", price: 22, stock: 100, unit: "adet", categoryId: catTemizlik.id },
    { name: "Bulaşık Süngeri", barcode: "8690000000019", price: 18, stock: 60, unit: "adet", categoryId: catTemizlik.id },
    { name: "Muz (kg)", barcode: "2700003000025", price: 95, stock: 30, unit: "kg", isWeighted: true, categoryId: catGida.id },
    { name: "Domates (kg)", barcode: "2700004000030", price: 45, stock: 40, unit: "kg", isWeighted: true, categoryId: catGida.id },
    { name: "Yumurta 30'lu", barcode: "8690000000020", price: 135, stock: 25, unit: "adet", categoryId: catGida.id, imageUrl: "https://images.unsplash.com/photo-1587486913049-77fc59ddd871?w=100" },
    { name: "Ayran 1L", barcode: "8690000000021", price: 32, stock: 50, unit: "adet", categoryId: catIcecek.id, imageUrl: "https://images.unsplash.com/photo-1623065425991-007d65ce34a8?w=100" },
  ];

  const createdProducts: Record<string, string> = {};
  for (const p of marketProducts) {
    const prod = await prisma.product.create({ data: { organizationId: org.id, ...p } });
    createdProducts[p.barcode] = prod.id;
  }

  const tshirt = await prisma.product.create({
    data: {
      organizationId: org.id,
      name: "Basic Tişört",
      barcode: "8690000000100",
      price: 299,
      stock: 0,
      hasVariants: true,
      unit: "adet",
      categoryId: catGiyim.id,
    },
  });

  const jeans = await prisma.product.create({
    data: {
      organizationId: org.id,
      name: "Slim Fit Jean",
      barcode: "8690000000110",
      price: 599,
      stock: 0,
      hasVariants: true,
      unit: "adet",
      categoryId: catGiyim.id,
    },
  });

  const variantData = [
    { productId: tshirt.id, size: "S", color: "Beyaz", barcode: "8690000000101", stock: 12, price: 299 },
    { productId: tshirt.id, size: "M", color: "Beyaz", barcode: "8690000000102", stock: 18, price: 299 },
    { productId: tshirt.id, size: "L", color: "Siyah", barcode: "8690000000103", stock: 9, price: 299 },
    { productId: tshirt.id, size: "XL", color: "Lacivert", barcode: "8690000000104", stock: 6, price: 319 },
    { productId: jeans.id, size: "30", color: "Mavi", barcode: "8690000000111", stock: 8, price: 599 },
    { productId: jeans.id, size: "32", color: "Mavi", barcode: "8690000000112", stock: 10, price: 599 },
    { productId: jeans.id, size: "34", color: "Siyah", barcode: "8690000000113", stock: 5, price: 649 },
  ];

  for (const v of variantData) {
    await prisma.productVariant.create({ data: v });
  }

  // F1-F8 kısayollar (kasiyer Ayşe'nin en çok sattığı ürünler)
  const shortcutBarcodes = [
    "8690000000001", // F1 Ekmek
    "8690000000002", // F2 Süt
    "8690000000004", // F3 Su
    "8690000000005", // F4 Çikolata
    "8690000000021", // F5 Ayran
    "8690000000014", // F6 Kola
    "8690000000020", // F7 Yumurta
    "8690000000013", // F8 Yoğurt
  ];

  for (let i = 0; i < shortcutBarcodes.length; i++) {
    const productId = createdProducts[shortcutBarcodes[i]];
    if (productId) {
      await prisma.productShortcut.create({
        data: { branchId: branchMerkez.id, productId, keySlot: i + 1 },
      });
    }
  }

  await prisma.campaign.createMany({
    data: [
      {
        organizationId: org.id,
        name: "2 Al 1 Öde Çikolata",
        type: "BUY_X_GET_Y",
        value: 0,
        buyQuantity: 2,
        getQuantity: 1,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
        isActive: true,
      },
      {
        organizationId: org.id,
        name: "Hafta Sonu %10 İndirim",
        type: "PERCENTAGE",
        value: 10,
        minAmount: 200,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
        isActive: true,
      },
    ],
  });

  const supplier = await prisma.supplier.create({
    data: { organizationId: org.id, name: "Metro Toptan", taxNumber: "9876543210", phone: "02165554433" },
  });

  await prisma.purchaseInvoice.create({
    data: {
      supplierId: supplier.id,
      invoiceNo: "MT-2026-001",
      total: 12500,
      items: [
        { name: "Süt 1L", qty: 100, price: 40 },
        { name: "Ekmek", qty: 200, price: 12 },
      ],
    },
  });

  const customers = [
    { name: "Ahmet Yılmaz", phone: "05559876543", loyaltyPoints: 250, creditLimit: 5000, balance: 500 },
    { name: "Fatma Kaya", phone: "05551112233", loyaltyPoints: 80, creditLimit: 3000, balance: 0 },
    { name: "Mehmet Öz", phone: "05554445566", loyaltyPoints: 420, creditLimit: 8000, balance: 1250 },
    { name: "Zeynep Arslan", phone: "05557778899", loyaltyPoints: 150, creditLimit: 2000, balance: 0 },
    { name: "Hasan Çelik", phone: "05553334455", loyaltyPoints: 0, creditLimit: 1500, balance: 680 },
  ];

  const customerIds: string[] = [];
  for (const c of customers) {
    const customer = await prisma.customer.create({
      data: { organizationId: org.id, name: c.name, phone: c.phone, loyaltyPoints: c.loyaltyPoints },
    });
    customerIds.push(customer.id);
    if (c.creditLimit > 0) {
      await prisma.customerAccount.create({
        data: { customerId: customer.id, creditLimit: c.creditLimit, balance: c.balance },
      });
    }
  }

  // Bugünkü örnek satışlar (Z raporu için)
  const todaySales = [
    { items: [{ barcode: "8690000000001", qty: 3 }, { barcode: "8690000000002", qty: 2 }], method: "CASH" as const, total: 135 },
    { items: [{ barcode: "8690000000004", qty: 5 }], method: "CARD" as const, total: 60 },
    { items: [{ barcode: "8690000000005", qty: 4 }], method: "CASH" as const, total: 140 },
    { items: [{ barcode: "8690000000014", qty: 2 }, { barcode: "8690000000021", qty: 1 }], method: "QR" as const, total: 108 },
  ];

  for (let i = 0; i < todaySales.length; i++) {
    const sale = todaySales[i];
    const saleItems = [];
    let subtotal = 0;

    for (const si of sale.items) {
      const prod = await prisma.product.findFirst({ where: { barcode: si.barcode, organizationId: org.id } });
      if (!prod) continue;
      const unitPrice = Number(prod.price);
      const itemTotal = unitPrice * si.qty;
      subtotal += itemTotal;
      saleItems.push({
        productId: prod.id,
        name: prod.name,
        barcode: prod.barcode,
        quantity: si.qty,
        unitPrice,
        discount: 0,
        taxRate: Number(prod.taxRate),
        total: itemTotal,
      });
    }

    await prisma.sale.create({
      data: {
        branchId: branchMerkez.id,
        registerId: register1.id,
        customerId: sale.customerIdx !== undefined ? customerIds[sale.customerIdx] : undefined,
        receiptNo: `R-DEMO-${1000 + i}`,
        subtotal,
        discount: 0,
        tax: subtotal * 0.2,
        total: subtotal,
        paymentMethod: sale.method,
        status: "COMPLETED",
        syncedAt: new Date(),
        items: { create: saleItems },
        payments: { create: [{ method: sale.method, amount: subtotal }] },
      },
    });
  }

  // Ahmet Yılmaz cari hareket demo: 1000 TL veresiye → 500 TL tahsilat → 500 TL kalan
  const ahmetAccount = await prisma.customerAccount.findUnique({ where: { customerId: customerIds[0] } });
  if (ahmetAccount) {
    const ahmetSale = await prisma.sale.create({
      data: {
        branchId: branchMerkez.id,
        registerId: register1.id,
        customerId: customerIds[0],
        receiptNo: "R-AHMET-VERESIYE",
        subtotal: 1000,
        discount: 0,
        tax: 200,
        total: 1000,
        paymentMethod: "CREDIT",
        status: "COMPLETED",
        syncedAt: new Date("2026-06-10T14:30:00"),
        createdAt: new Date("2026-06-10T14:30:00"),
        items: {
          create: [{
            productId: (await prisma.product.findFirst({ where: { barcode: "8690000000011", organizationId: org.id } }))!.id,
            name: "Zeytinyağı 1L",
            barcode: "8690000000011",
            quantity: 5,
            unitPrice: 200,
            discount: 0,
            taxRate: 20,
            total: 1000,
          }],
        },
        payments: { create: [{ method: "CREDIT", amount: 1000 }] },
      },
    });

    await prisma.creditEntry.create({
      data: {
        accountId: ahmetAccount.id,
        saleId: ahmetSale.id,
        amount: 1000,
        type: "DEBIT",
        note: "Veresiye alışveriş — zeytinyağı vb.",
        createdAt: new Date("2026-06-10T14:30:00"),
      },
    });

    await prisma.creditEntry.create({
      data: {
        accountId: ahmetAccount.id,
        amount: -500,
        type: "CREDIT",
        note: "Nakit tahsilat — Ahmet Yılmaz",
        createdAt: new Date("2026-06-12T10:00:00"),
      },
    });

    await prisma.customerAccount.update({
      where: { id: ahmetAccount.id },
      data: {
        balance: 500,
        paymentDueDate: new Date("2026-06-01"),
        paymentPromiseNote: "Ayın 1'inde ödeyeceğim dedi",
      },
    });

    await prisma.creditEntry.updateMany({
      where: { accountId: ahmetAccount.id, type: "DEBIT" },
      data: { dueDate: new Date("2026-06-01") },
    });
  }

  // Mehmet Öz — yaklaşan vade (2 gün kaldı)
  const mehmetAccount = await prisma.customerAccount.findUnique({ where: { customerId: customerIds[2] } });
  if (mehmetAccount) {
    const due = new Date();
    due.setDate(due.getDate() + 2);
    await prisma.customerAccount.update({
      where: { id: mehmetAccount.id },
      data: { paymentDueDate: due, paymentPromiseNote: "Perşembe ödeyecek" },
    });
  }

  // Hasan Çelik — vadesi geçmiş
  const hasanAccount = await prisma.customerAccount.findUnique({ where: { customerId: customerIds[4] } });
  if (hasanAccount) {
    const pastDue = new Date();
    pastDue.setDate(pastDue.getDate() - 5);
    await prisma.customerAccount.update({
      where: { id: hasanAccount.id },
      data: { paymentDueDate: pastDue, paymentPromiseNote: "Geçen hafta ödeyecekti" },
    });
  }

  // Dünkü Z raporu
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  await prisma.zReport.create({
    data: {
      branchId: branchMerkez.id,
      registerId: register1.id,
      reportDate: yesterday,
      totalSales: 4850,
      totalRefunds: 120,
      cashTotal: 2100,
      cardTotal: 1800,
      qrTotal: 530,
      creditTotal: 420,
      saleCount: 47,
    },
  });

  console.log("\n✅ Mock veriler yüklendi!\n");
  console.log("🌐 Platform: platform@aurabarkod.com / platform123");
  console.log("👤 Admin:   admin@aurabarkod.com / admin123");
  console.log("🧑‍💼 Kasiyer: ayse.kasiyer@aurabarkod.com / kasa123");
  console.log("\n📦 20 market ürünü + 7 giyim varyantı");
  console.log("👥 5 müşteri (3 veresiyeli)");
  console.log("🏪 2 şube, 3 kasa, F1-F8 kısayollar");
  console.log("📊 5 bugünkü satış + dünkü Z raporu\n");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
