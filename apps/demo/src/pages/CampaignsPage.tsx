import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Percent, Tag } from "lucide-react";
import AdminLayout from "../components/AdminLayout";
import { api } from "../lib/api";
import { useModules } from "../lib/modules";

type Campaign = {
  id: string;
  name: string;
  type: string;
  value: number | string;
  buyQuantity?: number;
  getQuantity?: number;
  minAmount?: number | string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

const emptyForm = {
  name: "",
  type: "PERCENTAGE",
  value: "10",
  buyQuantity: "2",
  getQuantity: "1",
  minAmount: "",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
  isActive: true,
};

export default function CampaignsPage() {
  const { has } = useModules();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [roi, setRoi] = useState<{
    stats: { discountedSaleCount: number; totalDiscountGiven: number; revenueFromDiscountedSales: number; activeCampaigns: number };
  } | null>(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");

  async function load() {
    const [list, roiData] = await Promise.all([
      api<Campaign[]>("/campaigns"),
      api<typeof roi>("/campaigns/roi"),
    ]);
    setCampaigns(list);
    setRoi(roiData);
  }

  useEffect(() => { if (has("campaigns")) load().catch(() => {}); }, []);

  if (!has("campaigns")) {
    return (
      <AdminLayout title="Kampanyalar">
        <p className="text-slate-400">Kampanya modülü Giyim paketinde aktiftir.</p>
      </AdminLayout>
    );
  }

  function openAdd() {
    setForm(emptyForm);
    setEditing(null);
    setModal(true);
  }

  function openEdit(c: Campaign) {
    setEditing(c);
    setForm({
      name: c.name,
      type: c.type,
      value: String(c.value),
      buyQuantity: String(c.buyQuantity ?? 2),
      getQuantity: String(c.getQuantity ?? 1),
      minAmount: c.minAmount ? String(c.minAmount) : "",
      startDate: c.startDate.slice(0, 10),
      endDate: c.endDate.slice(0, 10),
      isActive: c.isActive,
    });
    setModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name,
      type: form.type,
      value: parseFloat(form.value),
      buyQuantity: form.type === "BUY_X_GET_Y" ? parseInt(form.buyQuantity) : undefined,
      getQuantity: form.type === "BUY_X_GET_Y" ? parseInt(form.getQuantity) : undefined,
      minAmount: form.minAmount ? parseFloat(form.minAmount) : undefined,
      startDate: form.startDate,
      endDate: form.endDate,
      isActive: form.isActive,
    };
    if (editing) {
      await api(`/campaigns/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
      setMessage("Kampanya güncellendi");
    } else {
      await api("/campaigns", { method: "POST", body: JSON.stringify(payload) });
      setMessage("Kampanya oluşturuldu");
    }
    setModal(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Kampanya silinsin mi?")) return;
    await api(`/campaigns/${id}`, { method: "DELETE" });
    load();
  }

  const typeLabel: Record<string, string> = {
    PERCENTAGE: "% İndirim",
    FIXED: "Sabit İndirim",
    BUY_X_GET_Y: "Al-X-Öde-Y",
    SEASONAL: "Sezonluk",
  };

  return (
    <AdminLayout title="Kampanyalar">
      {message && <div className="mb-4 text-teal-400 text-sm">{message}</div>}

      {roi && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Stat label="Aktif kampanya" value={roi.stats.activeCampaigns} />
          <Stat label="İndirimli satış" value={roi.stats.discountedSaleCount} />
          <Stat label="Verilen indirim" value={`${roi.stats.totalDiscountGiven.toFixed(0)} ₺`} />
          <Stat label="İndirimli ciro" value={`${roi.stats.revenueFromDiscountedSales.toFixed(0)} ₺`} />
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold text-slate-300">Kampanya Listesi</h2>
        <button onClick={openAdd} className="flex items-center gap-1 bg-teal-600 hover:bg-teal-500 px-4 py-2 rounded-lg text-sm">
          <Plus size={16} /> Yeni Kampanya
        </button>
      </div>

      <div className="space-y-2">
        {campaigns.map((c) => (
          <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="font-medium flex items-center gap-2">
                <Tag size={14} className="text-purple-400" />
                {c.name}
                {!c.isActive && <span className="text-xs text-slate-500">(pasif)</span>}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {typeLabel[c.type] || c.type} · {Number(c.value)}{c.type === "PERCENTAGE" ? "%" : " ₺"}
                {" · "}{new Date(c.startDate).toLocaleDateString("tr-TR")} — {new Date(c.endDate).toLocaleDateString("tr-TR")}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(c)} className="p-2 text-slate-400 hover:text-white"><Pencil size={16} /></button>
              <button onClick={() => handleDelete(c.id)} className="p-2 text-slate-400 hover:text-red-400"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
        {campaigns.length === 0 && <p className="text-slate-500 text-sm">Henüz kampanya yok</p>}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSave} className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md space-y-3">
            <h3 className="font-bold text-lg">{editing ? "Kampanya Düzenle" : "Yeni Kampanya"}</h3>
            <input placeholder="Kampanya adı" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2" required />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2">
              <option value="PERCENTAGE">Yüzde İndirim</option>
              <option value="FIXED">Sabit Tutar</option>
              <option value="BUY_X_GET_Y">Al X Öde Y</option>
              <option value="SEASONAL">Sezonluk</option>
            </select>
            <input placeholder="Değer" type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2" required />
            {form.type === "BUY_X_GET_Y" && (
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Al (adet)" value={form.buyQuantity} onChange={(e) => setForm({ ...form, buyQuantity: e.target.value })} className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2" />
                <input placeholder="Öde (adet)" value={form.getQuantity} onChange={(e) => setForm({ ...form, getQuantity: e.target.value })} className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2" />
              </div>
            )}
            <input placeholder="Min. sepet (opsiyonel)" type="number" value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: e.target.value })} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2" />
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2" />
              <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2" />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-400">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Aktif
            </label>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setModal(false)} className="flex-1 border border-slate-600 rounded-lg py-2">İptal</button>
              <button type="submit" className="flex-1 bg-teal-600 rounded-lg py-2 font-medium">Kaydet</button>
            </div>
          </form>
        </div>
      )}
    </AdminLayout>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-xl font-bold text-purple-400 mt-1">{value}</div>
    </div>
  );
}
