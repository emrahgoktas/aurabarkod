import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Upload, Cloud, Building2, Printer, Store, Shirt,
  Users, MapPin, Truck, Plus, UserX, Download,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../stores/pos";
import { useModules } from "../lib/modules";
import { PACKAGE_FEATURES, PACKAGE_LABELS } from "../lib/packageMeta";
import TrialBanner from "../components/TrialBanner";

type Tab = "general" | "team" | "branches" | "suppliers" | "billing" | "efatura";

type TeamUser = { id: string; name: string; email: string; role: string; branchId?: string; isActive: boolean };
type Branch = { id: string; name: string; address?: string; registers: Array<{ id: string; name: string; code: string }> };
type Supplier = { id: string; name: string; taxNumber?: string; phone?: string; _count?: { invoices: number } };
type Backup = { id: string; filePath: string; sizeBytes: number; createdAt: string };
type Export = { id: string; provider: string; periodStart: string; periodEnd: string; createdAt: string };

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { packageType, has } = useModules();
  const [tab, setTab] = useState<Tab>("general");
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [team, setTeam] = useState<TeamUser[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [exports, setExports] = useState<Export[]>([]);

  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "cashier", branchId: "" });
  const [branchForm, setBranchForm] = useState({ name: "", address: "", phone: "" });
  const [supplierForm, setSupplierForm] = useState({ name: "", taxNumber: "", phone: "" });
  const [invoiceForm, setInvoiceForm] = useState({
    supplierId: "", invoiceNo: "", barcode: "", name: "", qty: "1", price: "",
  });

  const pkgMeta = PACKAGE_LABELS[packageType];
  const features = PACKAGE_FEATURES[packageType];

  async function loadTeam() { setTeam(await api<TeamUser[]>("/users")); }
  async function loadBranches() { setBranches(await api<Branch[]>("/branches")); }
  async function loadSuppliers() {
    const [s, inv] = await Promise.all([
      api<Supplier[]>("/suppliers"),
      api<Array<{ id: string; invoiceNo: string; total: number; createdAt: string; supplier: { name: string } }>>("/suppliers/invoices"),
    ]);
    setSuppliers(s);
    setInvoiceList(inv);
  }
  const [invoiceList, setInvoiceList] = useState<Array<{ id: string; invoiceNo: string; total: number; createdAt: string; supplier: { name: string } }>>([]);
  const [subscription, setSubscription] = useState<{
    plan: string; planLabel: string; monthlyPrice: number; status: string;
    trialExpiresAt?: string; currentPeriodEnd?: string; features: string[];
  } | null>(null);
  const [efaturaConfig, setEfaturaConfig] = useState<{ provider: string; gibConfigured: boolean; testMode: boolean } | null>(null);

  useEffect(() => {
    if (tab === "team") loadTeam().catch(() => {});
    if (tab === "branches") loadBranches().catch(() => {});
    if (tab === "suppliers" && has("supplier_invoice")) loadSuppliers().catch(() => {});
    if (tab === "general") {
      api<Backup[]>("/backup/list").then(setBackups).catch(() => {});
      api<Export[]>("/accounting/exports").then(setExports).catch(() => {});
    }
    if (tab === "billing") api<typeof subscription>("/billing/subscription").then(setSubscription).catch(() => {});
    if (tab === "efatura") api<typeof efaturaConfig>("/efatura/config").then(setEfaturaConfig).catch(() => {});
  }, [tab]);

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    const token = localStorage.getItem("aura_token");
    const res = await fetch("/api/import/products/csv", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json();
    setMessage(`${data.imported} ürün içe aktarıldı`);
  }

  async function createBackup() {
    const result = await api<{ backup: Backup }>("/backup/create", { method: "POST" });
    setMessage(`Yedek oluşturuldu: ${(result.backup.sizeBytes / 1024).toFixed(1)} KB`);
    setBackups(await api<Backup[]>("/backup/list"));
  }

  async function exportAccounting() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const end = now.toISOString();
    await api("/accounting/export", {
      method: "POST",
      body: JSON.stringify({ provider: "logo", periodStart: start, periodEnd: end }),
    });
    setMessage("Logo formatında dışa aktarım tamamlandı");
    setExports(await api<Export[]>("/accounting/exports"));
  }

  async function downloadExport(id: string) {
    const token = localStorage.getItem("aura_token");
    const res = await fetch(`/api/accounting/exports/${id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logo-export-${id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    await api("/users", { method: "POST", body: JSON.stringify({ ...userForm, branchId: userForm.branchId || undefined }) });
    setUserForm({ name: "", email: "", password: "", role: "cashier", branchId: "" });
    setMessage("Kullanıcı eklendi");
    loadTeam();
  }

  async function toggleUser(id: string, isActive: boolean) {
    await api(`/users/${id}`, { method: "PATCH", body: JSON.stringify({ isActive: !isActive }) });
    loadTeam();
  }

  async function addBranch(e: React.FormEvent) {
    e.preventDefault();
    await api("/branches", { method: "POST", body: JSON.stringify(branchForm) });
    setBranchForm({ name: "", address: "", phone: "" });
    setMessage("Şube oluşturuldu");
    loadBranches();
  }

  async function addSupplier(e: React.FormEvent) {
    e.preventDefault();
    await api("/suppliers", { method: "POST", body: JSON.stringify(supplierForm) });
    setSupplierForm({ name: "", taxNumber: "", phone: "" });
    setMessage("Tedarikçi eklendi");
    loadSuppliers();
  }

  async function addInvoice(e: React.FormEvent) {
    e.preventDefault();
    await api("/suppliers/invoices", {
      method: "POST",
      body: JSON.stringify({
        supplierId: invoiceForm.supplierId,
        invoiceNo: invoiceForm.invoiceNo,
        items: [{
          barcode: invoiceForm.barcode || undefined,
          name: invoiceForm.name,
          qty: parseFloat(invoiceForm.qty),
          price: parseFloat(invoiceForm.price),
        }],
      }),
    });
    setInvoiceForm({ supplierId: "", invoiceNo: "", barcode: "", name: "", qty: "1", price: "" });
    setMessage("Alış faturası kaydedildi — stok güncellendi");
    loadSuppliers();
  }

  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode; show: boolean }> = [
    { id: "general", label: "Genel", icon: <Printer size={16} />, show: true },
    { id: "team", label: "Ekip", icon: <Users size={16} />, show: true },
    { id: "branches", label: "Şubeler", icon: <MapPin size={16} />, show: has("multi_branch") },
    { id: "suppliers", label: "Tedarikçi", icon: <Truck size={16} />, show: has("supplier_invoice") },
    { id: "billing", label: "Abonelik", icon: <Building2 size={16} />, show: true },
    { id: "efatura", label: "e-Fatura", icon: <Building2 size={16} />, show: true },
  ];

  return (
    <div className="min-h-screen bg-slate-950">
      <TrialBanner />
      <div className="p-6">
        <div className="max-w-3xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6"><ArrowLeft size={18} /> Kasa</Link>
          <h1 className="text-2xl font-bold text-teal-400 mb-1">Ayarlar</h1>
          <p className="text-sm text-slate-500 mb-4">{user?.organization?.name} · {user?.name}</p>

          <div className={`inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-full mb-6 ${packageType === "MARKET" ? "bg-emerald-900/40 text-emerald-300" : "bg-purple-900/40 text-purple-300"}`}>
            {packageType === "MARKET" ? <Store size={14} /> : <Shirt size={14} />}
            {pkgMeta.title} Modülü
          </div>

          <div className="flex gap-1 mb-6 flex-wrap border-b border-slate-800 pb-2">
            {tabs.filter((t) => t.show).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm ${tab === t.id ? "bg-teal-900/50 text-teal-300" : "text-slate-400 hover:bg-slate-800"}`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {message && <div className="bg-teal-900/30 text-teal-300 rounded-lg p-3 mb-6 text-sm">{message}</div>}

          {tab === "general" && (
            <div className="space-y-4">
              <Section title="Fiş ve Termal Yazıcı" icon={<Printer size={18} />}>
                <Link to="/settings/receipt" className="inline-block bg-teal-600 hover:bg-teal-500 px-4 py-2 rounded-lg text-sm font-medium">Fiş Ayarlarını Düzenle</Link>
              </Section>
              <Section title="Ürün İçe Aktarım (CSV)" icon={<Upload size={18} />}>
                <input ref={fileRef} type="file" accept=".csv" onChange={handleCsvImport} className="text-sm" />
              </Section>
              <Section title="Yedekleme" icon={<Cloud size={18} />}>
                <button onClick={createBackup} className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm mb-3">Şimdi Yedekle</button>
                {backups.length > 0 && (
                  <ul className="text-xs text-slate-500 space-y-1">
                    {backups.slice(0, 5).map((b) => (
                      <li key={b.id}>{new Date(b.createdAt).toLocaleString("tr-TR")} — {(b.sizeBytes / 1024).toFixed(1)} KB</li>
                    ))}
                  </ul>
                )}
              </Section>
              <Section title="Muhasebe (Logo)" icon={<Building2 size={18} />}>
                <button onClick={exportAccounting} className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm mb-3">Dışa Aktar</button>
                {exports.map((ex) => (
                  <button key={ex.id} onClick={() => downloadExport(ex.id)} className="flex items-center gap-2 text-sm text-teal-400 hover:underline mr-4">
                    <Download size={14} /> {new Date(ex.periodStart).toLocaleDateString("tr-TR")} — {ex.provider}
                  </button>
                ))}
              </Section>
              <Section title="Aktif modüller" icon={<Building2 size={18} />}>
                <div className="flex flex-wrap gap-2">
                  {features.map((f) => (
                    <span key={f} className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-full">{f}</span>
                  ))}
                </div>
              </Section>
            </div>
          )}

          {tab === "team" && (
            <div className="space-y-6">
              <Section title="Kasiyer / Admin Ekle" icon={<Plus size={18} />}>
                <form onSubmit={addUser} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input placeholder="Ad Soyad" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" required />
                  <input placeholder="E-posta" type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" required />
                  <input placeholder="Şifre" type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" required />
                  <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">
                    <option value="cashier">Kasiyer</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button type="submit" className="sm:col-span-2 bg-teal-600 hover:bg-teal-500 rounded-lg py-2 text-sm font-medium">Ekle</button>
                </form>
              </Section>
              <Section title="Ekip Listesi" icon={<Users size={18} />}>
                <div className="space-y-2">
                  {team.map((u) => (
                    <div key={u.id} className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-3">
                      <div>
                        <div className="font-medium">{u.name} {!u.isActive && <span className="text-red-400 text-xs">(pasif)</span>}</div>
                        <div className="text-xs text-slate-500">{u.email} · {u.role === "admin" ? "Admin" : "Kasiyer"}</div>
                      </div>
                      {u.id !== user?.id && (
                        <button onClick={() => toggleUser(u.id, u.isActive)} className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1">
                          <UserX size={14} /> {u.isActive ? "Pasifleştir" : "Aktifleştir"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          )}

          {tab === "branches" && (
            <div className="space-y-6">
              <Section title="Yeni Şube" icon={<Plus size={18} />}>
                <form onSubmit={addBranch} className="space-y-3">
                  <input placeholder="Şube adı" value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" required />
                  <input placeholder="Adres" value={branchForm.address} onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
                  <button type="submit" className="bg-teal-600 hover:bg-teal-500 rounded-lg px-4 py-2 text-sm">Şube Oluştur</button>
                </form>
              </Section>
              <Section title="Şubeler ve Kasalar" icon={<MapPin size={18} />}>
                {branches.map((b) => (
                  <div key={b.id} className="bg-slate-800 rounded-lg p-4 mb-3">
                    <div className="font-medium">{b.name}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Kasalar: {b.registers.map((r) => `${r.name} (${r.code})`).join(", ") || "—"}
                    </div>
                  </div>
                ))}
              </Section>
            </div>
          )}

          {tab === "suppliers" && has("supplier_invoice") && (
            <div className="space-y-6">
              <Section title="Tedarikçi Ekle" icon={<Plus size={18} />}>
                <form onSubmit={addSupplier} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input placeholder="Firma adı" value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" required />
                  <input placeholder="VKN" value={supplierForm.taxNumber} onChange={(e) => setSupplierForm({ ...supplierForm, taxNumber: e.target.value })} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
                  <input placeholder="Telefon" value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
                  <button type="submit" className="sm:col-span-3 bg-teal-600 hover:bg-teal-500 rounded-lg py-2 text-sm">Kaydet</button>
                </form>
              </Section>
              <Section title="Alış Faturası → Stok" icon={<Truck size={18} />}>
                <form onSubmit={addInvoice} className="grid grid-cols-2 gap-3">
                  <select value={invoiceForm.supplierId} onChange={(e) => setInvoiceForm({ ...invoiceForm, supplierId: e.target.value })} className="col-span-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" required>
                    <option value="">Tedarikçi seçin</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <input placeholder="Fatura no" value={invoiceForm.invoiceNo} onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNo: e.target.value })} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" required />
                  <input placeholder="Barkod" value={invoiceForm.barcode} onChange={(e) => setInvoiceForm({ ...invoiceForm, barcode: e.target.value })} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
                  <input placeholder="Ürün adı" value={invoiceForm.name} onChange={(e) => setInvoiceForm({ ...invoiceForm, name: e.target.value })} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" required />
                  <input placeholder="Miktar" type="number" value={invoiceForm.qty} onChange={(e) => setInvoiceForm({ ...invoiceForm, qty: e.target.value })} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
                  <input placeholder="Birim fiyat" type="number" value={invoiceForm.price} onChange={(e) => setInvoiceForm({ ...invoiceForm, price: e.target.value })} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" required />
                  <button type="submit" className="col-span-2 bg-teal-600 hover:bg-teal-500 rounded-lg py-2 text-sm">Faturayı Kaydet</button>
                </form>
              </Section>
              {invoiceList.length > 0 && (
                <Section title="Son Faturalar" icon={<Truck size={18} />}>
                  {invoiceList.slice(0, 10).map((inv) => (
                    <div key={inv.id} className="text-sm text-slate-400 py-1 border-b border-slate-800">
                      {inv.supplier.name} — {inv.invoiceNo} — {Number(inv.total).toFixed(2)} ₺
                    </div>
                  ))}
                </Section>
              )}
            </div>
          )}

          {tab === "billing" && subscription && (
            <div className="space-y-4">
              <Section title="Mevcut Plan" icon={<Building2 size={18} />}>
                <div className="text-2xl font-bold text-teal-400">{subscription.planLabel}</div>
                <div className="text-sm text-slate-400 mt-1">
                  {subscription.monthlyPrice > 0 ? `₺${subscription.monthlyPrice}/ay` : "Ücretsiz deneme"}
                  {subscription.trialExpiresAt && subscription.plan === "TRIAL" && (
                    <> · Bitiş: {new Date(subscription.trialExpiresAt).toLocaleDateString("tr-TR")}</>
                  )}
                </div>
                <ul className="mt-3 space-y-1">
                  {subscription.features.map((f) => (
                    <li key={f} className="text-sm text-slate-400">✓ {f}</li>
                  ))}
                </ul>
                <p className="text-xs text-slate-500 mt-4">Plan yükseltme için platform yöneticisi ile iletişime geçin.</p>
              </Section>
            </div>
          )}

          {tab === "efatura" && efaturaConfig && (
            <Section title="e-Fatura Yapılandırması" icon={<Building2 size={18} />}>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-400">Aktif sağlayıcı</span><span>{efaturaConfig.provider}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">GIB yapılandırması</span><span>{efaturaConfig.gibConfigured ? "Hazır" : "Eksik"}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Test modu</span><span>{efaturaConfig.testMode ? "Açık" : "Kapalı"}</span></div>
              </div>
              <p className="text-xs text-slate-500 mt-4">
                GIB entegrasyonu için sunucuda GIB_USERNAME, GIB_PASSWORD ortam değişkenlerini tanımlayın.
                Satış sonrası e-Fatura API üzerinden kesilir.
              </p>
            </Section>
          )}

          <button onClick={logout} className="w-full text-red-400 border border-red-800 rounded-xl py-3 mt-8 hover:bg-red-900/20">
            Çıkış Yap
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <h3 className="font-semibold flex items-center gap-2 mb-3">{icon} {title}</h3>
      {children}
    </div>
  );
}
