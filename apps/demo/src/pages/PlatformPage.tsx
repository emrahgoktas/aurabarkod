import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Building2, LogOut, RefreshCw } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../stores/pos";

type Tenant = {
  id: string;
  slug: string;
  name: string;
  email: string | null;
  taxNumber: string | null;
  packageType: string;
  status: "TRIAL" | "ACTIVE" | "SUSPENDED";
  trialExpiresAt?: string | null;
  subscription?: { plan: string; monthlyPrice: number | string; status: string } | null;
  _count: { users: number; branches: number; products: number };
};

const STATUS_LABEL: Record<string, string> = {
  TRIAL: "Deneme", ACTIVE: "Aktif", SUSPENDED: "Askıda",
};

const STATUS_CLASS: Record<string, string> = {
  TRIAL: "bg-amber-900/40 text-amber-300 border-amber-700",
  ACTIVE: "bg-teal-900/40 text-teal-300 border-teal-700",
  SUSPENDED: "bg-red-900/40 text-red-300 border-red-700",
};

const PLAN_OPTIONS = [
  { value: "TRIAL", label: "Deneme" },
  { value: "STARTER", label: "Başlangıç (₺499)" },
  { value: "PRO", label: "Pro (₺999)" },
  { value: "ENTERPRISE", label: "Kurumsal (₺2499)" },
];

export default function PlatformPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [stats, setStats] = useState({ tenantCount: 0, activeCount: 0, trialCount: 0 });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [overview, list] = await Promise.all([
        api<{ stats: typeof stats }>("/platform/overview"),
        api<Tenant[]>("/platform/tenants"),
      ]);
      setStats(overview.stats);
      setTenants(list);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function setStatus(id: string, status: Tenant["status"]) {
    await api(`/platform/tenants/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    load();
  }

  async function setPlan(id: string, plan: string) {
    await api(`/platform/tenants/${id}/subscription`, { method: "PATCH", body: JSON.stringify({ plan }) });
    load();
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="text-teal-400" />
          <div>
            <h1 className="font-bold text-lg">Aura Barkod — Merkez Panel</h1>
            <p className="text-xs text-slate-500">{user?.name} · Platform yöneticisi</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="p-2 rounded-lg border border-slate-700 hover:border-slate-500" title="Yenile">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white px-3 py-2 rounded-lg border border-slate-700">
            <LogOut size={16} /> Çıkış
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Toplam tenant" value={stats.tenantCount} />
          <StatCard label="Aktif" value={stats.activeCount} />
          <StatCard label="Deneme" value={stats.trialCount} />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center">
            <h2 className="font-semibold">Kayıtlı işletmeler</h2>
            <Link to="/register" className="text-sm text-teal-400 hover:text-teal-300">+ Yeni kayıt</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-500 border-b border-slate-800">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">İşletme</th>
                  <th className="text-left px-3 py-3 font-medium">URL</th>
                  <th className="text-left px-3 py-3 font-medium">Plan</th>
                  <th className="text-left px-3 py-3 font-medium">Durum</th>
                  <th className="text-right px-5 py-3 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                    <td className="px-5 py-3">
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-slate-500">{t.slug} · {t._count.users} kullanıcı</div>
                    </td>
                    <td className="px-3 py-3 text-xs text-teal-400 font-mono">{t.slug}.aurabarkod.com</td>
                    <td className="px-3 py-3">
                      <select
                        value={t.subscription?.plan || "TRIAL"}
                        onChange={(e) => setPlan(t.id, e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs"
                      >
                        {PLAN_OPTIONS.map((p) => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_CLASS[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {t.status !== "ACTIVE" && (
                        <button onClick={() => setStatus(t.id, "ACTIVE")} className="text-xs text-teal-400 hover:underline mr-3">Aktifleştir</button>
                      )}
                      {t.status !== "SUSPENDED" && (
                        <button onClick={() => setStatus(t.id, "SUSPENDED")} className="text-xs text-red-400 hover:underline">Askıya al</button>
                      )}
                    </td>
                  </tr>
                ))}
                {!loading && tenants.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500">Henüz kayıtlı işletme yok</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="text-slate-500 text-sm">{label}</div>
      <div className="text-3xl font-bold mt-1 text-teal-400">{value}</div>
    </div>
  );
}
