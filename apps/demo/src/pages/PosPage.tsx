import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  LayoutDashboard, User, Trash2, CreditCard, Banknote, QrCode,
  Receipt, Plus, Minus, X, RotateCcw, Pause, Play, Undo2,
  FileText, Split, AlertCircle, CloudOff,
} from "lucide-react";
import { api, isOnline, syncOfflineSales, getPendingOfflineCount } from "../lib/api";
import { offlineDb } from "../lib/offline";
import { useAuth, useCart, type PaymentMethod } from "../stores/pos";
import PaymentAlertsBanner from "../components/PaymentAlertsBanner";
import ProductImage, { ImageSizePicker } from "../components/ProductImage";
import CashierCustomerPanel from "../components/CashierCustomerPanel";
import TrialBanner from "../components/TrialBanner";
import { getImageSize, setImageSize, IMAGE_SIZES, type ImageSize } from "../lib/posSettings";
import { useModules } from "../lib/modules";
import { getHeldCarts, holdCart, removeHeldCart } from "../lib/heldCarts";
import {
  printReceipt as printThermalReceipt,
  cacheReceiptSettings,
  getCachedReceiptSettings,
  DEFAULT_RECEIPT_SETTINGS,
  type ReceiptSettings,
} from "../lib/printReceipt";
import type { CartItem, SalePayment } from "../lib/shared";

interface Product {
  id: string; name: string; barcode?: string; price: number | string;
  stock?: number | string; taxRate?: number | string; unit?: string; imageUrl?: string;
  isWeighted?: boolean;
  selectedVariant?: { id: string; size?: string; color?: string };
  scaleWeight?: number; calculatedPrice?: number; quantity?: number;
}

interface Shortcut { keySlot: number; product: Product }

interface RecentSale {
  id: string; receiptNo: string; total: number | string; createdAt: string;
  status: string;
  items: Array<{ id: string; name: string; quantity: number | string; total: number | string; refunded?: boolean }>;
  customer?: { name: string };
}

interface ZReport {
  totalSales: number | string; saleCount: number; cashTotal: number | string;
  cardTotal: number | string; qrTotal: number | string; creditTotal: number | string;
  totalRefunds: number | string;
}

function beep(ok = true) {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = ok ? 880 : 220;
    g.gain.value = 0.08;
    o.start(); o.stop(ctx.currentTime + 0.08);
  } catch { /* */ }
}

export default function PosPage() {
  const { user, branchId, registerId } = useAuth();
  const isCashier = user?.role === "cashier";
  const isAdmin = !isCashier;
  const { isRetail } = useModules();
  const { items, addItem, removeItem, updateQty, clear, loadCart, subtotal, tax, total, customerId, setCustomer } = useCart();

  const [customerName, setCustomerName] = useState<string>();
  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings>(
    () => getCachedReceiptSettings() || DEFAULT_RECEIPT_SETTINGS
  );

  const [barcode, setBarcode] = useState("");
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [online, setOnline] = useState(isOnline());
  const [pendingSync, setPendingSync] = useState(0);
  const [imgSize, setImgSize] = useState<ImageSize>(getImageSize());
  const [lastProduct, setLastProduct] = useState<Product | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [cashModal, setCashModal] = useState(false);
  const [splitModal, setSplitModal] = useState(false);
  const [cashReceived, setCashReceived] = useState("");
  const [splitCash, setSplitCash] = useState("");
  const [splitCard, setSplitCard] = useState("");
  const [customerPanel, setCustomerPanel] = useState(false);
  const [heldOpen, setHeldOpen] = useState(false);
  const [heldCarts, setHeldCarts] = useState(getHeldCarts());
  const [refundOpen, setRefundOpen] = useState(false);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [expandedSale, setExpandedSale] = useState<string | null>(null);
  const [refundSelection, setRefundSelection] = useState<Record<string, Set<string>>>({});
  const [zReportOpen, setZReportOpen] = useState(false);
  const [zReport, setZReport] = useState<ZReport | null>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [flash, setFlash] = useState<"ok" | "err" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sizes = IMAGE_SIZES[imgSize];

  function showToast(type: "ok" | "err", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }

  async function refreshPending() {
    setPendingSync(await getPendingOfflineCount());
  }

  useEffect(() => {
    api<Shortcut[]>(`/products/shortcuts/${branchId}`).then(setShortcuts).catch(() => {});
    api<ReceiptSettings>("/receipt/settings").then((s) => {
      const merged = { ...DEFAULT_RECEIPT_SETTINGS, ...s };
      setReceiptSettings(merged);
      cacheReceiptSettings(merged);
    }).catch(() => {});
    refreshPending();
    const on = async () => { setOnline(true); const r = await syncOfflineSales(); if (r.synced) showToast("ok", `${r.synced} offline satış senkronize edildi`); refreshPending(); };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    inputRef.current?.focus();
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, [branchId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F12" && items.length) { e.preventDefault(); setPaymentOpen(true); return; }
      if (e.key === "Escape") { setPaymentOpen(false); setCashModal(false); setSplitModal(false); setRefundOpen(false); setZReportOpen(false); return; }

      if (paymentOpen && !cashModal && !splitModal) {
        if (e.key === "F1") { e.preventDefault(); setCashModal(true); }
        if (e.key === "F2") { e.preventDefault(); void pay("CARD"); }
        if (e.key === "F3") { e.preventDefault(); void pay("QR"); }
        if (e.key === "F4") { e.preventDefault(); tryCredit(); }
        return;
      }

      if (!paymentOpen && e.key.startsWith("F")) {
        const n = parseInt(e.key.slice(1));
        const sc = shortcuts.find((s) => s.keySlot === n);
        if (n >= 1 && n <= 8 && sc?.product) { e.preventDefault(); addProduct(sc.product); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcuts, items, paymentOpen, cashModal, splitModal, customerId]);

  function addProduct(product: Product, qty = 1) {
    const price = product.calculatedPrice ?? Number(product.price);
    const quantity = product.scaleWeight ?? product.quantity ?? qty;
    const unitPrice = product.calculatedPrice ? price / quantity : Number(product.price);
    addItem({
      productId: product.id, variantId: product.selectedVariant?.id,
      name: product.selectedVariant ? `${product.name} (${product.selectedVariant.size}/${product.selectedVariant.color})` : product.name,
      barcode: product.barcode, imageUrl: product.imageUrl, quantity, unitPrice, discount: 0,
      taxRate: Number(product.taxRate) || 20,
      total: product.calculatedPrice ?? unitPrice * quantity,
    });
    setLastProduct(product);
    beep(true);
    setFlash("ok");
    setTimeout(() => setFlash(null), 400);
    inputRef.current?.focus();
  }

  async function onScan(e: React.FormEvent) {
    e.preventDefault();
    const code = barcode.trim();
    if (!code) return;
    try {
      let product: Product;
      if (online) {
        product = await api(`/products/barcode/${encodeURIComponent(code)}`);
        await offlineDb.products.put({
          id: product.id, name: product.name, barcode: product.barcode,
          price: Number(product.price), stock: Number(product.stock || 0),
          taxRate: Number(product.taxRate) || 20, unit: product.unit || "adet", imageUrl: product.imageUrl,
        });
      } else {
        const c = await offlineDb.products.where("barcode").equals(code).first();
        if (!c) throw new Error("Ürün bulunamadı — önce online iken okutulmalı");
        product = c as Product;
      }
      addProduct(product);
      setBarcode("");
    } catch (err) {
      beep(false);
      setFlash("err");
      showToast("err", err instanceof Error ? err.message : "Ürün bulunamadı");
      setTimeout(() => setFlash(null), 400);
    }
  }

  function tryCredit() {
    if (!customerId) { showToast("err", "Veresiye için önce müşteri seçin"); return; }
    void pay("CREDIT");
  }

  async function pay(method: PaymentMethod, payments?: SalePayment[]) {
    if (method === "CREDIT" && !customerId) { showToast("err", "Veresiye için önce müşteri seçin"); return; }
    const cartItems = [...items];
    const saleSubtotal = subtotal();
    const saleTax = tax();
    const saleTotal = total();
    const payload = {
      branchId, registerId, customerId, items: cartItems,
      subtotal: saleSubtotal, discount: 0, tax: saleTax, total: saleTotal,
      paymentMethod: method, payments, offlineId: `offline-${Date.now()}`,
    };
    try {
      let receiptNo = payload.offlineId!;
      if (online) {
        const sale = await api<{ receiptNo: string }>("/sales", { method: "POST", body: JSON.stringify(payload) });
        receiptNo = sale.receiptNo;
      } else {
        await offlineDb.sales.add({ ...payload, createdAt: new Date().toISOString(), synced: false });
        await refreshPending();
        showToast("ok", "Offline kaydedildi — internet gelince senkronize olacak");
      }
      printThermalReceipt(receiptSettings, {
        receiptNo,
        items: cartItems,
        subtotal: saleSubtotal,
        tax: saleTax,
        total: saleTotal,
        paymentMethod: method,
        payments,
        cashierName: user?.name,
        customerName,
      });
      clear();
      setCustomerName(undefined);
      setLastProduct(null);
      setPaymentOpen(false);
      setCashModal(false);
      setSplitModal(false);
      setCashReceived("");
      inputRef.current?.focus();
    } catch (err) {
      showToast("err", err instanceof Error ? err.message : "Ödeme başarısız");
      setFlash("err");
    }
  }

  function confirmSplit() {
    const cash = parseFloat(splitCash) || 0;
    const card = parseFloat(splitCard) || 0;
    if (Math.abs(cash + card - total()) > 0.02) {
      showToast("err", "Nakit + Kart toplamı satış tutarına eşit olmalı");
      return;
    }
    void pay("CARD", [{ method: "CASH", amount: cash }, { method: "CARD", amount: card }]);
  }

  function selectCustomer(id?: string, name?: string) {
    setCustomer(id);
    setCustomerName(name);
  }

  function doHold() {
    if (!items.length) return;
    holdCart(items, customerId);
    setHeldCarts(getHeldCarts());
    clear();
    setLastProduct(null);
    showToast("ok", "Sepet bekletildi");
  }

  function restoreHeld(id: string) {
    const cart = getHeldCarts().find((c) => c.id === id);
    if (!cart) return;
    if (items.length) showToast("err", "Önce mevcut sepeti bekletin veya temizleyin");
    else {
      loadCart(cart.items, cart.customerId);
      removeHeldCart(id);
      setHeldCarts(getHeldCarts());
      setHeldOpen(false);
      showToast("ok", "Sepet geri yüklendi");
    }
  }

  async function openRefunds() {
    if (!online) { showToast("err", "İade için internet gerekli"); return; }
    const sales = await api<RecentSale[]>(`/sales/recent?registerId=${registerId}&limit=15`);
    setRecentSales(sales);
    setRefundOpen(true);
  }

  async function refundSale(id: string, saleItemIds?: string[]) {
    try {
      if (saleItemIds?.length) {
        await api(`/sales/${id}/refund-items`, { method: "POST", body: JSON.stringify({ saleItemIds }) });
        showToast("ok", `${saleItemIds.length} satır iade edildi`);
      } else {
        await api(`/sales/${id}/refund`, { method: "POST" });
        showToast("ok", "Tüm fiş iade edildi");
      }
      const sales = await api<RecentSale[]>(`/sales/recent?registerId=${registerId}&limit=15`);
      setRecentSales(sales);
      setRefundSelection({});
    } catch (err) {
      showToast("err", err instanceof Error ? err.message : "İade başarısız");
    }
  }

  function toggleRefundItem(saleId: string, itemId: string) {
    setRefundSelection((prev) => {
      const set = new Set(prev[saleId] || []);
      if (set.has(itemId)) set.delete(itemId);
      else set.add(itemId);
      return { ...prev, [saleId]: set };
    });
  }

  async function loadZReport() {
    if (!online) { showToast("err", "Z raporu için internet gerekli"); return; }
    try {
      const report = await api<ZReport>("/reports/z-report", {
        method: "POST",
        body: JSON.stringify({ branchId, registerId }),
      });
      setZReport(report);
      setZReportOpen(true);
    } catch (err) {
      showToast("err", err instanceof Error ? err.message : "Z raporu alınamadı");
    }
  }

  const change = cashReceived ? Math.max(0, parseFloat(cashReceived) - total()) : 0;
  const quickCash = [50, 100, 200];

  return (
    <div className={`min-h-screen flex flex-col bg-slate-950 transition-colors ${flash === "ok" ? "bg-teal-950/30" : flash === "err" ? "bg-red-950/30" : ""}`}>
      <TrialBanner />
      <div className="flex flex-1 min-h-0">
      <CashierCustomerPanel open={customerPanel} onClose={() => setCustomerPanel(false)} selectedId={customerId} onSelect={selectCustomer} />

      {/* SOL */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-4 py-2 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <span className="font-bold text-teal-400 text-lg">Kasa</span>
            <span className={`w-2 h-2 rounded-full ${online ? "bg-emerald-400" : "bg-amber-400"}`} title={online ? "Çevrimiçi" : "Offline"} />
            {!online && (
              <span className="text-xs text-amber-400 flex items-center gap-1">
                <CloudOff size={12} /> Offline{pendingSync > 0 && ` · ${pendingSync} bekliyor`}
              </span>
            )}
            {online && pendingSync > 0 && (
              <span className="text-xs text-amber-400">{pendingSync} satış senkron bekliyor</span>
            )}
            <ImageSizePicker value={imgSize} onChange={(s) => { setImgSize(s); setImageSize(s); }} />
          </div>
          <div className="flex items-center gap-1">
            {isAdmin && <PaymentAlertsBanner compact />}
            <button type="button" onClick={() => setCustomerPanel(true)} className="p-2 text-slate-500 hover:text-teal-400" title="Müşteri (Ctrl+M)"><User size={18} /></button>
            <button type="button" onClick={doHold} disabled={!items.length} className="p-2 text-slate-500 hover:text-amber-400 disabled:opacity-30" title="Sepeti beklet"><Pause size={18} /></button>
            <button type="button" onClick={() => { setHeldCarts(getHeldCarts()); setHeldOpen(true); }} className="p-2 text-slate-500 hover:text-amber-400 relative" title="Bekleyen sepetler">
              <Play size={18} />
              {heldCarts.length > 0 && <span className="absolute top-0 right-0 w-4 h-4 bg-amber-500 text-[10px] rounded-full flex items-center justify-center text-black font-bold">{heldCarts.length}</span>}
            </button>
            <button type="button" onClick={openRefunds} className="p-2 text-slate-500 hover:text-red-400" title="İade"><Undo2 size={18} /></button>
            <button type="button" onClick={loadZReport} className="p-2 text-slate-500 hover:text-blue-400" title="Z Raporu"><FileText size={18} /></button>
            {isAdmin && <Link to="/dashboard" className="p-2 text-slate-500 hover:text-teal-400"><LayoutDashboard size={18} /></Link>}
          </div>
        </header>

        {toast && (
          <div className={`mx-4 mt-2 px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${toast.type === "err" ? "bg-red-900/40 text-red-300 border border-red-700" : "bg-emerald-900/30 text-emerald-300 border border-emerald-700"}`}>
            <AlertCircle size={14} /> {toast.msg}
          </div>
        )}

        <div className="flex-1 flex flex-col p-4 gap-3">
          <form onSubmit={onScan}>
            <input ref={inputRef} value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Barkod okut..." autoFocus
              className="w-full text-3xl font-mono bg-slate-900 border-2 border-slate-700 focus:border-teal-500 rounded-2xl px-5 py-4 outline-none" />
          </form>

          {lastProduct && (
            <div className="flex items-center gap-4 bg-slate-900/80 rounded-2xl p-4 border border-slate-800">
              <ProductImage url={lastProduct.imageUrl} name={lastProduct.name} sizeClass={sizes.hero} rounded="rounded-xl" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-lg truncate">{lastProduct.name}</div>
                {lastProduct.selectedVariant && (
                  <div className={`${isRetail ? "text-base font-semibold text-purple-300" : "text-sm text-slate-400"}`}>
                    {lastProduct.selectedVariant.size} / {lastProduct.selectedVariant.color}
                  </div>
                )}
                {lastProduct.scaleWeight && <div className="text-sm text-slate-400">{lastProduct.scaleWeight.toFixed(3)} kg</div>}
                <div className="text-2xl font-bold text-teal-400 mt-1">₺{(lastProduct.calculatedPrice ?? Number(lastProduct.price)).toFixed(2)}</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 8 }, (_, i) => {
              const sc = shortcuts.find((s) => s.keySlot === i + 1);
              return (
                <button key={i} type="button" onClick={() => sc && addProduct(sc.product)}
                  className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-teal-700 rounded-xl p-2 transition text-left">
                  {sc ? <ProductImage url={sc.product.imageUrl} name={sc.product.name} sizeClass={sizes.shortcut} /> : <div className={`${sizes.shortcut} rounded-lg bg-slate-800`} />}
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] text-teal-600 font-mono">F{i + 1}</div>
                    <div className="text-xs truncate text-slate-300">{sc?.product.name || "—"}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-auto min-h-[200px]">
            {items.length === 0 ? (
              <div className="text-center text-slate-600 py-16 text-sm">Barkod okutun veya F1–F8</div>
            ) : (
              <div className="space-y-1">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-slate-900 rounded-xl px-3 py-2 border border-slate-800/50">
                    <ProductImage url={item.imageUrl} name={item.name} sizeClass={sizes.cart} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{item.name}</div>
                      <div className="text-xs text-slate-500">₺{item.unitPrice.toFixed(2)}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => updateQty(idx, Math.max(0.001, item.quantity - 1))} className="p-1 rounded bg-slate-800"><Minus size={12} /></button>
                      <span className="w-8 text-center text-sm font-mono">{item.quantity}</span>
                      <button type="button" onClick={() => updateQty(idx, item.quantity + 1)} className="p-1 rounded bg-slate-800"><Plus size={12} /></button>
                    </div>
                    <div className="font-semibold text-sm w-20 text-right">₺{item.total.toFixed(2)}</div>
                    <button type="button" onClick={() => removeItem(idx)} className="text-slate-600 hover:text-red-400 p-1" title="Satır iptal"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <button type="button" onClick={() => clear()} className="text-xs text-slate-600 hover:text-red-400 flex items-center gap-1 self-start">
              <RotateCcw size={12} /> Sepeti temizle
            </button>
          )}
        </div>
      </div>

      {/* SAĞ — Ödeme */}
      <aside className="w-72 bg-slate-900 border-l border-slate-800 flex flex-col p-4 shrink-0">
        <button type="button" onClick={() => setCustomerPanel(true)} className="flex items-center gap-2 text-sm mb-4 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 w-full text-left">
          <User size={14} className="text-slate-500" />
          <span className="truncate flex-1">{customerName || (customerId ? "Müşteri seçili" : "Misafir — müşteri seç")}</span>
        </button>

        <div className="flex-1 flex flex-col justify-end">
          <div className="text-4xl font-bold text-teal-400 text-right mb-1">₺{total().toFixed(2)}</div>
          <div className="text-xs text-slate-500 text-right mb-4">{items.length} ürün · F12 ödeme</div>

          {!paymentOpen ? (
            <button type="button" onClick={() => items.length && setPaymentOpen(true)} disabled={!items.length}
              className="w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-30 rounded-xl py-4 font-bold text-lg flex items-center justify-center gap-2">
              <Receipt size={20} /> Ödeme (F12)
            </button>
          ) : cashModal ? (
            <div className="space-y-2">
              <input type="number" autoFocus value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} placeholder="Alınan tutar"
                className="w-full bg-slate-800 rounded-lg px-3 py-3 text-xl text-center font-mono" />
              <div className="grid grid-cols-4 gap-1">
                {quickCash.map((a) => (
                  <button key={a} type="button" onClick={() => setCashReceived(String(a))} className="bg-slate-800 hover:bg-slate-700 rounded py-1.5 text-xs font-mono">₺{a}</button>
                ))}
                <button type="button" onClick={() => setCashReceived(String(Math.ceil(total())))} className="bg-slate-800 hover:bg-slate-700 rounded py-1.5 text-xs">Tam</button>
              </div>
              {cashReceived && <div className="text-center text-emerald-400 font-bold text-lg">Üstü: ₺{change.toFixed(2)}</div>}
              <button type="button" onClick={() => pay("CASH")} disabled={!cashReceived || parseFloat(cashReceived) < total()} className="w-full bg-emerald-600 py-3 rounded-xl font-bold">Onayla (F1)</button>
              <button type="button" onClick={() => setCashModal(false)} className="w-full text-slate-500 text-sm py-1">Geri</button>
            </div>
          ) : splitModal ? (
            <div className="space-y-2">
              <div className="text-xs text-slate-400 text-center mb-1">Toplam: ₺{total().toFixed(2)}</div>
              <input type="number" value={splitCash} onChange={(e) => setSplitCash(e.target.value)} placeholder="Nakit" className="w-full bg-slate-800 rounded-lg px-3 py-2 text-center font-mono" />
              <input type="number" value={splitCard} onChange={(e) => setSplitCard(e.target.value)} placeholder="Kart" className="w-full bg-slate-800 rounded-lg px-3 py-2 text-center font-mono" />
              <div className="text-xs text-center text-slate-500">Kalan: ₺{Math.max(0, total() - (parseFloat(splitCash) || 0) - (parseFloat(splitCard) || 0)).toFixed(2)}</div>
              <button type="button" onClick={confirmSplit} className="w-full bg-indigo-600 py-3 rounded-xl font-bold text-sm">Karma Ödemeyi Onayla</button>
              <button type="button" onClick={() => setSplitModal(false)} className="w-full text-slate-500 text-sm py-1">Geri</button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-[10px] text-slate-600 text-center mb-1">F1 Nakit · F2 Kart · F3 QR · F4 Veresiye</div>
              <div className="grid grid-cols-2 gap-2">
                <PayBtn icon={Banknote} label="Nakit (F1)" color="bg-emerald-600" onClick={() => setCashModal(true)} />
                <PayBtn icon={CreditCard} label="Kart (F2)" color="bg-blue-600" onClick={() => pay("CARD")} />
                <PayBtn icon={QrCode} label="QR (F3)" color="bg-purple-600" onClick={() => pay("QR")} />
                <PayBtn icon={User} label="Veresiye (F4)" color="bg-amber-700" onClick={tryCredit} />
              </div>
              <button type="button" onClick={() => { setSplitCash(""); setSplitCard(""); setSplitModal(true); }}
                className="w-full bg-indigo-900/50 hover:bg-indigo-900 border border-indigo-700 rounded-xl py-2 flex items-center justify-center gap-1 text-sm text-indigo-300">
                <Split size={14} /> Karma Ödeme
              </button>
              <button type="button" onClick={() => setPaymentOpen(false)} className="w-full text-slate-500 text-sm py-2 flex items-center justify-center gap-1"><X size={14} /> İptal (Esc)</button>
            </div>
          )}
        </div>
      </aside>

      {/* Bekleyen sepetler modal */}
      {heldOpen && (
        <Modal title="Bekleyen Sepetler" onClose={() => setHeldOpen(false)}>
          {heldCarts.length === 0 ? <p className="text-slate-500 text-sm">Bekleyen sepet yok</p> : heldCarts.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-2 border-b border-slate-800">
              <div>
                <div className="font-medium text-sm">{c.label}</div>
                <div className="text-xs text-slate-500">{c.items.length} ürün · {new Date(c.heldAt).toLocaleTimeString("tr-TR")}</div>
              </div>
              <button type="button" onClick={() => restoreHeld(c.id)} className="bg-teal-600 px-3 py-1 rounded text-sm">Yükle</button>
            </div>
          ))}
        </Modal>
      )}

      {/* İade modal */}
      {refundOpen && (
        <Modal title="Son Satışlar — İade" onClose={() => { setRefundOpen(false); setExpandedSale(null); }}>
          {recentSales.length === 0 ? <p className="text-slate-500 text-sm">Satış bulunamadı</p> : recentSales.map((s) => {
            const activeItems = s.items.filter((i) => !i.refunded);
            const selected = refundSelection[s.id] || new Set<string>();
            const expanded = expandedSale === s.id;
            return (
              <div key={s.id} className="py-3 border-b border-slate-800">
                <div className="flex justify-between items-start gap-2">
                  <button type="button" className="text-left flex-1" onClick={() => setExpandedSale(expanded ? null : s.id)}>
                    <div className="font-mono text-sm text-teal-400">{s.receiptNo}</div>
                    <div className="text-xs text-slate-500">{new Date(s.createdAt).toLocaleString("tr-TR")} · {activeItems.length} aktif satır</div>
                    {s.customer && <div className="text-xs text-slate-400">{s.customer.name}</div>}
                  </button>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-sm">₺{Number(s.total).toFixed(2)}</div>
                    <button type="button" onClick={() => refundSale(s.id)} className="text-xs text-red-400 hover:text-red-300 mt-1">Tümünü iade</button>
                  </div>
                </div>
                {expanded && (
                  <div className="mt-2 space-y-1 pl-2">
                    {activeItems.map((item) => (
                      <label key={item.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                        <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleRefundItem(s.id, item.id)} className="accent-red-500" />
                        <span className="flex-1 truncate">{item.name}</span>
                        <span className="text-slate-500 text-xs">{item.quantity} adet</span>
                        <span className="font-mono text-xs">₺{Number(item.total).toFixed(2)}</span>
                      </label>
                    ))}
                    {selected.size > 0 && (
                      <button type="button" onClick={() => refundSale(s.id, Array.from(selected))}
                        className="mt-2 w-full bg-red-900/50 hover:bg-red-900 border border-red-700 text-red-300 py-2 rounded-lg text-sm font-medium">
                        Seçilen {selected.size} satırı iade et
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </Modal>
      )}

      {/* Z raporu modal */}
      {zReportOpen && zReport && (
        <Modal title="Günlük Z Raporu" onClose={() => setZReportOpen(false)}>
          <div className="space-y-2 text-sm">
            <Row label="Satış Adedi" value={String(zReport.saleCount)} />
            <Row label="Toplam Ciro" value={`₺${Number(zReport.totalSales).toFixed(2)}`} />
            <Row label="Nakit" value={`₺${Number(zReport.cashTotal).toFixed(2)}`} />
            <Row label="Kart" value={`₺${Number(zReport.cardTotal).toFixed(2)}`} />
            <Row label="QR" value={`₺${Number(zReport.qrTotal).toFixed(2)}`} />
            <Row label="Veresiye" value={`₺${Number(zReport.creditTotal).toFixed(2)}`} />
            <Row label="İadeler" value={`₺${Number(zReport.totalRefunds).toFixed(2)}`} />
          </div>
        </Modal>
      )}
      </div>
    </div>
  );
}

function PayBtn({ icon: Icon, label, color, onClick }: { icon: typeof Banknote; label: string; color: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`${color} hover:opacity-90 rounded-xl py-3 flex flex-col items-center gap-1 text-xs font-semibold`}>
      <Icon size={18} /> {label}
    </button>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-xl p-5 w-full max-w-md max-h-[80vh] overflow-auto shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-teal-400">{title}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 border-b border-slate-800">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
