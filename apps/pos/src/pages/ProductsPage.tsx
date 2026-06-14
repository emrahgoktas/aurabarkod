import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, ImageIcon, Percent, AlertTriangle, Printer, Tag, Layers } from "lucide-react";
import AdminLayout from "../components/AdminLayout";
import { api } from "../lib/api";
import { useModules } from "../lib/modules";
import { printLabels } from "../lib/printLabel";

interface Category { id: string; name: string }

interface Variant { id: string; barcode?: string; size?: string; color?: string; price?: number | string; stock: number | string }

interface Product {
  id: string;
  name: string;
  barcode?: string;
  price: number | string;
  costPrice?: number | string;
  stock: number | string;
  minStock?: number | string;
  unit: string;
  taxRate: number | string;
  isWeighted: boolean;
  isActive: boolean;
  hasVariants?: boolean;
  imageUrl?: string;
  category?: Category;
  categoryId?: string;
  variants?: Variant[];
}

const emptyForm = {
  name: "", barcode: "", price: "", costPrice: "", stock: "0", minStock: "10",
  unit: "adet", taxRate: "20", isWeighted: false, categoryId: "", imageUrl: "",
};

export default function ProductsPage() {
  const { isMarket, isRetail, has } = useModules();
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [outOfStockOnly, setOutOfStockOnly] = useState(false);
  const [modal, setModal] = useState<"add" | "edit" | "bulk" | "variants" | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);
  const [variantForm, setVariantForm] = useState({ barcode: "", size: "", color: "", price: "", stock: "0" });
  const [form, setForm] = useState(emptyForm);
  const [quickPrice, setQuickPrice] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkPercent, setBulkPercent] = useState("10");
  const [bulkCategory, setBulkCategory] = useState("");
  const [labelCopies, setLabelCopies] = useState("1");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const params = new URLSearchParams({ all: "1", search });
    if (outOfStockOnly) params.set("outOfStock", "1");
    const [prods, cats, low] = await Promise.all([
      api<Product[]>(`/products?${params}`),
      api<Category[]>("/products/categories"),
      api<Product[]>("/products/low-stock"),
    ]);
    setProducts(prods);
    setCategories(cats);
    setLowStock(low);
  }

  useEffect(() => { load().catch(() => {}); }, [search, outOfStockOnly]);

  function openAdd() {
    setForm(emptyForm);
    setEditing(null);
    setModal("add");
    setError("");
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name,
      barcode: p.barcode || "",
      price: String(p.price),
      costPrice: p.costPrice ? String(p.costPrice) : "",
      stock: String(p.stock),
      minStock: String(p.minStock ?? 10),
      unit: p.unit,
      taxRate: String(p.taxRate),
      isWeighted: p.isWeighted,
      categoryId: p.category?.id || "",
      imageUrl: p.imageUrl || "",
    });
    setModal("edit");
    setError("");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const payload = {
      name: form.name,
      barcode: form.barcode || undefined,
      price: parseFloat(form.price),
      costPrice: form.costPrice ? parseFloat(form.costPrice) : undefined,
      stock: parseFloat(form.stock),
      minStock: parseFloat(form.minStock),
      unit: form.unit,
      taxRate: parseFloat(form.taxRate),
      isWeighted: form.isWeighted,
      categoryId: form.categoryId || undefined,
      imageUrl: form.imageUrl || undefined,
    };
    try {
      if (modal === "add") {
        await api("/products", { method: "POST", body: JSON.stringify(payload) });
        setMessage("Ürün eklendi");
      } else if (editing) {
        await api(`/products/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
        setMessage("Ürün güncellendi");
      }
      setModal(null);
      load();
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hata");
    }
  }

  async function handleBulkPrice(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const percent = parseFloat(bulkPercent);
    if (isNaN(percent)) return;
    try {
      const res = await api<{ updated: number; message: string }>("/products/bulk-price", {
        method: "POST",
        body: JSON.stringify({
          percent,
          categoryId: bulkCategory || undefined,
          productIds: selected.size > 0 ? Array.from(selected) : undefined,
        }),
      });
      setMessage(res.message);
      setModal(null);
      load();
      setTimeout(() => setMessage(""), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hata");
    }
  }

  async function quickPriceUpdate(id: string) {
    const price = parseFloat(quickPrice[id]);
    if (!price || price <= 0) return;
    await api(`/products/${id}/price`, { method: "PATCH", body: JSON.stringify({ price }) });
    setMessage("Fiyat güncellendi");
    setQuickPrice((s) => ({ ...s, [id]: "" }));
    load();
    setTimeout(() => setMessage(""), 2000);
  }

  function openVariants(p: Product) {
    setVariantProduct(p);
    setVariantForm({ barcode: "", size: "", color: "", price: String(p.price), stock: "0" });
    setModal("variants");
  }

  async function addVariant(e: React.FormEvent) {
    e.preventDefault();
    if (!variantProduct) return;
    await api(`/products/${variantProduct.id}/variants`, {
      method: "POST",
      body: JSON.stringify({
        barcode: variantForm.barcode || undefined,
        size: variantForm.size || undefined,
        color: variantForm.color || undefined,
        price: variantForm.price ? parseFloat(variantForm.price) : undefined,
        stock: parseFloat(variantForm.stock),
      }),
    });
    setMessage("Varyant eklendi");
    setModal(null);
    load();
  }

  async function deleteVariant(productId: string, variantId: string) {
    if (!confirm("Varyant silinsin mi?")) return;
    await api(`/products/${productId}/variants/${variantId}`, { method: "DELETE" });
    load();
    if (variantProduct) {
      const updated = await api<Product[]>(`/products?all=1&search=${encodeURIComponent(variantProduct.name)}`);
      const p = updated.find((x) => x.id === productId);
      if (p) setVariantProduct(p);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" pasife alınsın mı?`)) return;
    await api(`/products/${id}`, { method: "DELETE" });
    setMessage("Ürün pasife alındı");
    load();
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === products.filter((p) => p.isActive).length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.filter((p) => p.isActive).map((p) => p.id)));
    }
  }

  function handlePrintLabels(ids?: string[]) {
    const target = ids
      ? products.filter((p) => ids.includes(p.id))
      : products.filter((p) => selected.has(p.id));
    if (!target.length) { setMessage("Etiket için ürün seçin"); return; }
    printLabels(
      target.map((p) => ({ name: p.name, barcode: p.barcode, price: p.price, unit: p.unit })),
      parseInt(labelCopies) || 1
    );
  }

  function isLow(p: Product) {
    return Number(p.stock) <= Number(p.minStock ?? 10);
  }

  return (
    <AdminLayout title="Ürün Yönetimi">
      {message && <div className="mb-4 bg-teal-900/30 text-teal-300 rounded-lg px-4 py-2 text-sm">{message}</div>}

      {outOfStockOnly && products.length === 0 && (
        <p className="text-slate-500 text-sm mb-4">Stoğu tükenmiş ürün bulunamadı.</p>
      )}

      {/* Düşük stok — market modülü */}
      {isMarket && !outOfStockOnly && lowStock.length > 0 && (
        <div className="mb-4 bg-red-900/20 border border-red-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-400 font-semibold mb-2">
            <AlertTriangle size={18} /> Düşük Stok Uyarısı — {lowStock.length} ürün
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStock.slice(0, 8).map((p) => (
              <span key={p.id} className="text-xs bg-red-900/40 text-red-300 px-3 py-1 rounded-full">
                {p.name}: <strong>{Number(p.stock)}</strong> {p.unit} (min: {Number(p.minStock ?? 10)})
              </span>
            ))}
            {lowStock.length > 8 && <span className="text-xs text-red-400">+{lowStock.length - 8} daha</span>}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-48 flex items-center bg-slate-900 border border-slate-700 rounded-lg px-3">
          <Search size={16} className="text-slate-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ürün veya barkod ara..." className="flex-1 bg-transparent px-3 py-3 text-sm focus:outline-none" />
        </div>
        <button
          type="button"
          onClick={() => setOutOfStockOnly((v) => !v)}
          className={`px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2 border transition ${outOfStockOnly ? "bg-red-900/40 border-red-600 text-red-300" : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500"}`}
        >
          <AlertTriangle size={16} /> Stoğu tükenmiş
        </button>
        <button onClick={() => { setModal("bulk"); setError(""); }} className="bg-amber-700 hover:bg-amber-600 px-4 py-3 rounded-lg font-semibold flex items-center gap-2 text-sm">
          <Percent size={16} /> Toplu Fiyat
        </button>
        <button
          onClick={() => handlePrintLabels()}
          disabled={selected.size === 0 || !has("label_print")}
          className="bg-slate-700 hover:bg-slate-600 disabled:opacity-40 px-4 py-3 rounded-lg font-semibold flex items-center gap-2 text-sm"
          title={has("label_print") ? "Etiket yazdır" : "Giyim modülünde aktif"}
        >
          <Printer size={16} /> Etiket ({selected.size})
        </button>
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3">
          <Tag size={14} className="text-slate-500" />
          <input type="number" min="1" max="20" value={labelCopies} onChange={(e) => setLabelCopies(e.target.value)} className="w-12 bg-transparent text-sm text-center" />
          <span className="text-xs text-slate-500">kopya</span>
        </div>
        <button onClick={openAdd} className="bg-teal-600 hover:bg-teal-500 px-5 py-3 rounded-lg font-semibold flex items-center gap-2">
          <Plus size={18} /> Yeni Ürün
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800">
            <tr>
              <th className="p-3 w-8"><input type="checkbox" onChange={toggleAll} checked={selected.size > 0 && selected.size === products.filter((p) => p.isActive).length} /></th>
              <th className="text-left p-3 w-12"></th>
              <th className="text-left p-3">Ürün</th>
              <th className="text-left p-3">Barkod</th>
              <th className="text-right p-3">Fiyat</th>
              <th className="text-right p-3">Stok</th>
              <th className="text-right p-3">Hızlı Fiyat</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className={`border-t border-slate-800 ${!p.isActive ? "opacity-40" : ""} ${isLow(p) && p.isActive ? "bg-red-900/10" : ""}`}>
                <td className="p-3">
                  {p.isActive && <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} />}
                </td>
                <td className="p-3">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-700" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center"><ImageIcon size={16} className="text-slate-600" /></div>
                  )}
                </td>
                <td className="p-3">
                  <div className="font-medium flex items-center gap-2">
                    {p.name}
                    {isLow(p) && p.isActive && <AlertTriangle size={14} className="text-red-400" />}
                  </div>
                  <div className="text-xs text-slate-500">{p.category?.name || "—"} · {p.unit}{p.isWeighted ? " (terazi)" : ""}
                    {isRetail && p.hasVariants && p.variants && p.variants.length > 0 && (
                      <span className="text-purple-400"> · {p.variants.length} varyant</span>
                    )}
                  </div>
                </td>
                <td className="p-3 font-mono text-xs text-slate-400">{p.barcode || "—"}</td>
                <td className="p-3 text-right font-semibold text-teal-400">₺{Number(p.price).toFixed(2)}</td>
                <td className={`p-3 text-right font-medium ${isLow(p) ? "text-red-400" : ""}`}>
                  {Number(p.stock)}
                  <span className="text-xs text-slate-500 block">min: {Number(p.minStock ?? 10)}</span>
                </td>
                <td className="p-3">
                  <div className="flex gap-1 justify-end">
                    <input
                      type="number"
                      placeholder="Yeni"
                      value={quickPrice[p.id] || ""}
                      onChange={(e) => setQuickPrice((s) => ({ ...s, [p.id]: e.target.value }))}
                      className="w-20 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-right"
                    />
                    <button onClick={() => quickPriceUpdate(p.id)} className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded">OK</button>
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex gap-2 justify-end">
                    {p.barcode && (
                      <button onClick={() => handlePrintLabels([p.id])} className="text-slate-400 hover:text-teal-400" title="Etiket yazdır">
                        <Printer size={16} />
                      </button>
                    )}
                    {isRetail && has("variants") && (
                      <button onClick={() => openVariants(p)} className="text-slate-400 hover:text-purple-400" title="Varyantlar">
                        <Layers size={16} />
                      </button>
                    )}
                    <button onClick={() => openEdit(p)} className="text-slate-400 hover:text-teal-400"><Pencil size={16} /></button>
                    {p.isActive && <button onClick={() => handleDelete(p.id, p.name)} className="text-slate-400 hover:text-red-400"><Trash2 size={16} /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Ürün ekle/düzenle modal */}
      {(modal === "add" || modal === "edit") && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSave} className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-auto">
            <h2 className="text-xl font-bold text-teal-400 mb-4">{modal === "add" ? "Yeni Ürün Ekle" : "Ürün Düzenle"}</h2>
            {error && <div className="mb-4 text-red-300 bg-red-900/30 rounded-lg p-3 text-sm">{error}</div>}
            <div className="space-y-3">
              <Field label="Ürün Adı *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Field label="Barkod" value={form.barcode} onChange={(v) => setForm({ ...form, barcode: v })} mono />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Satış Fiyatı *" value={form.price} onChange={(v) => setForm({ ...form, price: v })} type="number" />
                <Field label="Maliyet Fiyatı" value={form.costPrice} onChange={(v) => setForm({ ...form, costPrice: v })} type="number" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Stok" value={form.stock} onChange={(v) => setForm({ ...form, stock: v })} type="number" />
                <Field label="Min. Stok" value={form.minStock} onChange={(v) => setForm({ ...form, minStock: v })} type="number" />
                <Field label="Birim" value={form.unit} onChange={(v) => setForm({ ...form, unit: v })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Kategori</label>
                  <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm">
                    <option value="">Seçiniz</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <Field label="KDV %" value={form.taxRate} onChange={(v) => setForm({ ...form, taxRate: v })} type="number" />
              </div>
              <Field label="Ürün Resmi URL" value={form.imageUrl} onChange={(v) => setForm({ ...form, imageUrl: v })} placeholder="https://..." />
              {form.imageUrl && <img src={form.imageUrl} alt="Önizleme" className="w-20 h-20 rounded-lg object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />}
              {isMarket && (
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" checked={form.isWeighted} onChange={(e) => setForm({ ...form, isWeighted: e.target.checked })} />
                  Terazi ürünü (kg barkod) — Market modülü
                </label>
              )}
              {isRetail && (
                <p className="text-xs text-purple-400 bg-purple-900/20 rounded-lg px-3 py-2">
                  Giyim modülü: Beden/renk varyantları ürün kaydından sonra eklenebilir.
                </p>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button type="submit" className="flex-1 bg-teal-600 hover:bg-teal-500 py-3 rounded-lg font-semibold">Kaydet</button>
              <button type="button" onClick={() => setModal(null)} className="px-6 py-3 text-slate-400 hover:text-white">İptal</button>
            </div>
          </form>
        </div>
      )}

      {modal === "variants" && variantProduct && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-auto">
            <h2 className="text-xl font-bold text-purple-400 mb-2 flex items-center gap-2"><Layers size={20} /> {variantProduct.name} — Varyantlar</h2>
            {(variantProduct.variants || []).length > 0 ? (
              <div className="space-y-2 mb-4">
                {variantProduct.variants!.map((v) => (
                  <div key={v.id} className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-2 text-sm">
                    <span>{[v.size, v.color].filter(Boolean).join(" / ") || "Varyant"} · {v.barcode || "—"} · Stok: {Number(v.stock)}</span>
                    <button type="button" onClick={() => deleteVariant(variantProduct.id, v.id)} className="text-red-400 text-xs">Sil</button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm mb-4">Henüz varyant yok</p>
            )}
            <form onSubmit={addVariant} className="space-y-3 border-t border-slate-700 pt-4">
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Beden" value={variantForm.size} onChange={(e) => setVariantForm({ ...variantForm, size: e.target.value })} className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Renk" value={variantForm.color} onChange={(e) => setVariantForm({ ...variantForm, color: e.target.value })} className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm" />
              </div>
              <input placeholder="Barkod" value={variantForm.barcode} onChange={(e) => setVariantForm({ ...variantForm, barcode: e.target.value })} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Fiyat" type="number" value={variantForm.price} onChange={(e) => setVariantForm({ ...variantForm, price: e.target.value })} className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Stok" type="number" value={variantForm.stock} onChange={(e) => setVariantForm({ ...variantForm, stock: e.target.value })} className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-500 py-2 rounded-lg text-sm font-medium">Varyant Ekle</button>
                <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-slate-400">Kapat</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toplu fiyat modal */}
      {modal === "bulk" && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleBulkPrice} className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-amber-400 mb-2 flex items-center gap-2"><Percent size={20} /> Toplu Fiyat Güncelleme</h2>
            <p className="text-sm text-slate-400 mb-4">
              {selected.size > 0
                ? `${selected.size} seçili ürünün fiyatı güncellenecek`
                : "Tüm aktif ürünlerin fiyatı güncellenecek (kategori filtresi uygulanabilir)"}
            </p>
            {error && <div className="mb-4 text-red-300 bg-red-900/30 rounded-lg p-3 text-sm">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400">Zam / İndirim Oranı (%)</label>
                <input
                  type="number"
                  required
                  value={bulkPercent}
                  onChange={(e) => setBulkPercent(e.target.value)}
                  placeholder="Örn: 10 zam, -5 indirim"
                  className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-xl text-center font-mono"
                  step="0.5"
                />
                <div className="flex gap-2 mt-2">
                  {[5, 10, 15, -5, -10].map((v) => (
                    <button key={v} type="button" onClick={() => setBulkPercent(String(v))} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded">
                      {v > 0 ? `+${v}%` : `${v}%`}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400">Kategori Filtresi (opsiyonel)</label>
                <select value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value)} className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm">
                  <option value="">Tüm kategoriler</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-500 py-3 rounded-lg font-semibold">Uygula</button>
              <button type="button" onClick={() => setModal(null)} className="px-6 text-slate-400">İptal</button>
            </div>
          </form>
        </div>
      )}
    </AdminLayout>
  );
}

function Field({ label, value, onChange, type = "text", mono, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; mono?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs text-slate-400">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500 ${mono ? "font-mono" : ""}`}
        required={label.includes("*")}
        step={type === "number" ? "0.01" : undefined}
      />
    </div>
  );
}
