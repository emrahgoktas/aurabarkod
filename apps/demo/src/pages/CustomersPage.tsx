import { useEffect, useState } from "react";
import { Plus, Pencil, Banknote, Search, ScrollText, AlertTriangle, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import { api } from "../lib/api";

interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  loyaltyPoints: number;
  overdue?: boolean;
  daysOverdue?: number;
  account?: {
    balance: number;
    creditLimit: number;
    paymentDueDate?: string;
    paymentPromiseNote?: string;
  };
}

const emptyForm = {
  name: "", phone: "", email: "", creditLimit: "",
  paymentDueDate: "", paymentPromiseNote: "",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [debtOnly, setDebtOnly] = useState(false);
  const [modal, setModal] = useState<"add" | "edit" | "payment" | "promise" | null>(null);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("Nakit tahsilat");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const params = new URLSearchParams({ search });
    if (debtOnly) params.set("debtOnly", "1");
    const data = await api<Customer[]>(`/customers?${params}`);
    setCustomers(data);
  }

  useEffect(() => { load().catch(() => {}); }, [search, debtOnly]);

  function openAdd() {
    setForm(emptyForm);
    setEditing(null);
    setModal("add");
    setError("");
  }

  function openEdit(c: Customer) {
    setEditing(c);
    setForm({
      name: c.name,
      phone: c.phone || "",
      email: c.email || "",
      creditLimit: c.account ? String(c.account.creditLimit) : "",
      paymentDueDate: c.account?.paymentDueDate ? c.account.paymentDueDate.slice(0, 10) : "",
      paymentPromiseNote: c.account?.paymentPromiseNote || "",
    });
    setModal("edit");
    setError("");
  }

  function openPromise(c: Customer) {
    setEditing(c);
    setForm({
      ...emptyForm,
      paymentDueDate: c.account?.paymentDueDate ? c.account.paymentDueDate.slice(0, 10) : "",
      paymentPromiseNote: c.account?.paymentPromiseNote || "",
    });
    setModal("promise");
    setError("");
  }

  function openPayment(c: Customer) {
    setEditing(c);
    setPayAmount("");
    setModal("payment");
    setError("");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const payload = {
      name: form.name,
      phone: form.phone || undefined,
      email: form.email || undefined,
      creditLimit: form.creditLimit ? parseFloat(form.creditLimit) : undefined,
      paymentDueDate: form.paymentDueDate || undefined,
      paymentPromiseNote: form.paymentPromiseNote || undefined,
    };
    try {
      if (modal === "add") {
        await api("/customers", { method: "POST", body: JSON.stringify(payload) });
        setMessage("Müşteri eklendi");
      } else if (editing) {
        await api(`/customers/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
        setMessage("Müşteri güncellendi");
      }
      setModal(null);
      load();
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hata");
    }
  }

  async function handlePromise(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    try {
      await api(`/customers/${editing.id}/promise`, {
        method: "PATCH",
        body: JSON.stringify({
          paymentDueDate: form.paymentDueDate || null,
          paymentPromiseNote: form.paymentPromiseNote,
        }),
      });
      setMessage("Ödeme taahhüdü kaydedildi");
      setModal(null);
      load();
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hata");
    }
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) return;
    try {
      await api(`/customers/${editing.id}/payment`, { method: "POST", body: JSON.stringify({ amount, note: payNote || "Tahsilat" }) });
      setMessage(`₺${amount.toFixed(2)} tahsil edildi`);
      setModal(null);
      load();
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hata");
    }
  }

  return (
    <AdminLayout title="Müşteri Yönetimi">
      {message && <div className="mb-4 bg-teal-900/30 text-teal-300 rounded-lg px-4 py-2 text-sm">{message}</div>}

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-48 flex items-center bg-slate-900 border border-slate-700 rounded-lg px-3">
          <Search size={16} className="text-slate-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="İsim veya telefon ara..." className="flex-1 bg-transparent px-3 py-3 text-sm focus:outline-none" />
        </div>
        <button
          type="button"
          onClick={() => setDebtOnly((v) => !v)}
          className={`px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2 border transition ${debtOnly ? "bg-amber-900/50 border-amber-600 text-amber-300" : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500"}`}
        >
          <Banknote size={16} /> Sadece borçlular
        </button>
        <button onClick={openAdd} className="bg-teal-600 hover:bg-teal-500 px-5 py-3 rounded-lg font-semibold flex items-center gap-2">
          <Plus size={18} /> Yeni Müşteri
        </button>
      </div>

      {debtOnly && customers.length === 0 && (
        <p className="text-slate-500 text-sm mb-4">Borçlu müşteri bulunamadı.</p>
      )}

      <div className="grid gap-3">
        {customers.map((c) => (
          <div key={c.id} className={`bg-slate-900 border rounded-xl p-4 flex justify-between items-center ${c.overdue ? "border-red-600 bg-red-900/10" : "border-slate-800"}`}>
            <div>
              <div className="font-semibold text-lg flex items-center gap-2">
                {c.name}
                {c.overdue && (
                  <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                    <AlertTriangle size={12} /> {c.daysOverdue} gün gecikmiş
                  </span>
                )}
              </div>
              <div className="text-sm text-slate-400">{c.phone || "Telefon yok"}</div>
              {c.account?.paymentDueDate && Number(c.account.balance) > 0 && (
                <div className={`text-xs mt-1 ${c.overdue ? "text-red-400" : "text-amber-400"}`}>
                  Ödeme taahhüdü: {new Date(c.account.paymentDueDate).toLocaleDateString("tr-TR")}
                  {c.account.paymentPromiseNote && ` — ${c.account.paymentPromiseNote}`}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              {c.account ? (
                <div className="text-right">
                  <div className={`font-bold ${Number(c.account.balance) > 0 ? "text-red-400" : "text-emerald-400"}`}>
                    Borç: ₺{Number(c.account.balance).toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-500">Limit: ₺{Number(c.account.creditLimit).toFixed(0)}</div>
                </div>
              ) : (
                <div className="text-xs text-slate-500">Veresiye hesabı yok</div>
              )}
              <div className="flex gap-2">
                {c.account && (
                  <>
                    <button onClick={() => openPromise(c)} className="p-2 bg-amber-900/40 hover:bg-amber-800/50 rounded-lg text-amber-400" title="Ödeme taahhüdü">
                      <Calendar size={18} />
                    </button>
                    <Link to={`/customers/${c.id}/ledger`} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-amber-400" title="Cari Hareketler">
                      <ScrollText size={18} />
                    </Link>
                  </>
                )}
                {c.account && Number(c.account.balance) > 0 && (
                  <button onClick={() => openPayment(c)} className="p-2 bg-emerald-900/50 hover:bg-emerald-800/50 rounded-lg text-emerald-400" title="Tahsilat">
                    <Banknote size={18} />
                  </button>
                )}
                <button onClick={() => openEdit(c)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-teal-400">
                  <Pencil size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {(modal === "add" || modal === "edit") && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSave} className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-auto">
            <h2 className="text-xl font-bold text-teal-400 mb-4">{modal === "add" ? "Yeni Müşteri" : "Müşteri Düzenle"}</h2>
            {error && <div className="mb-4 text-red-300 bg-red-900/30 rounded-lg p-3 text-sm">{error}</div>}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Ad Soyad *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Telefon</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Veresiye Limiti (₺)</label>
                <input type="number" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Ödeme Taahhüt Tarihi</label>
                <input type="date" value={form.paymentDueDate} onChange={(e) => setForm({ ...form, paymentDueDate: e.target.value })} className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Taahhüt Notu</label>
                <input value={form.paymentPromiseNote} onChange={(e) => setForm({ ...form, paymentPromiseNote: e.target.value })} placeholder="Örn: Cuma günü ödeyecek" className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="submit" className="flex-1 bg-teal-600 hover:bg-teal-500 py-3 rounded-lg font-semibold">Kaydet</button>
              <button type="button" onClick={() => setModal(null)} className="px-6 text-slate-400">İptal</button>
            </div>
          </form>
        </div>
      )}

      {modal === "promise" && editing && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <form onSubmit={handlePromise} className="bg-slate-900 border border-amber-700 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-amber-400 mb-2 flex items-center gap-2"><Calendar size={20} /> Ödeme Taahhüdü</h2>
            <p className="text-slate-400 text-sm mb-4">{editing.name} — Borç: ₺{Number(editing.account?.balance || 0).toFixed(2)}</p>
            {error && <div className="mb-4 text-red-300 text-sm">{error}</div>}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Ödeyeceği Tarih *</label>
                <input type="date" required value={form.paymentDueDate} onChange={(e) => setForm({ ...form, paymentDueDate: e.target.value })} className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Not</label>
                <input value={form.paymentPromiseNote} onChange={(e) => setForm({ ...form, paymentPromiseNote: e.target.value })} placeholder="Örn: Maaş günü ödeyecek" className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-500 py-3 rounded-lg font-semibold">Kaydet</button>
              <button type="button" onClick={() => setModal(null)} className="px-6 text-slate-400">İptal</button>
            </div>
          </form>
        </div>
      )}

      {modal === "payment" && editing && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <form onSubmit={handlePayment} className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold text-teal-400 mb-2">Tahsilat</h2>
            <p className="text-slate-400 text-sm mb-4">{editing.name} — Borç: ₺{Number(editing.account?.balance || 0).toFixed(2)}</p>
            {error && <div className="mb-4 text-red-300 text-sm">{error}</div>}
            <input type="number" required autoFocus value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="Tahsilat tutarı" className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-xl text-center font-mono mb-3" step="0.01" />
            <input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Açıklama" className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-sm mb-4" />
            <div className="flex gap-3">
              <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-3 rounded-lg font-semibold">Tahsil Et</button>
              <button type="button" onClick={() => setModal(null)} className="px-6 text-slate-400">İptal</button>
            </div>
          </form>
        </div>
      )}
    </AdminLayout>
  );
}
