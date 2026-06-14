import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../stores/pos";
import BranchRegisterPicker from "../components/BranchRegisterPicker";

const DEMO_ACCOUNTS = [
  { label: "Kasiyer (Ayşe)", email: "ayse.kasiyer@aurabarkod.com", password: "kasa123" },
  { label: "Admin (Emre)", email: "admin@aurabarkod.com", password: "admin123" },
  { label: "Platform", email: "platform@aurabarkod.com", password: "platform123" },
];

type SessionBranch = {
  id: string;
  name: string;
  registers: Array<{ id: string; name: string; code: string }>;
};

export default function LoginPage() {
  const [email, setEmail] = useState(DEMO_ACCOUNTS[0].email);
  const [password, setPassword] = useState(DEMO_ACCOUNTS[0].password);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [picker, setPicker] = useState<{
    token: string;
    user: {
      id: string; name: string; email: string; role: string;
      organization: { id: string; slug: string; name: string; packageType: string; status: string } | null;
    };
    tenant: {
      status: string;
      trialDaysLeft: number;
      trialExpired: boolean;
      limits: { trialDays: number; maxTrialUsers: number; maxTrialProducts: number };
      usage: { users: number; products: number };
    } | null;
    branches: SessionBranch[];
    branchId?: string | null;
    registerId?: string | null;
    role: string;
  } | null>(null);

  const [tenantBrand, setTenantBrand] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const { setAuth, setWorkspace } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const slug = searchParams.get("tenant");
    if (!slug) return;
    fetch(`/api/tenants/resolve/${slug}`)
      .then((r) => r.json())
      .then((d) => { if (d.tenant?.name) setTenantBrand(d.tenant.name); })
      .catch(() => {});
  }, [searchParams]);

  function selectDemo(idx: number) {
    setEmail(DEMO_ACCOUNTS[idx].email);
    setPassword(DEMO_ACCOUNTS[idx].password);
  }

  async function finishLogin(
    token: string,
    user: {
      id: string; name: string; email: string; role: string;
      organization: { id: string; slug: string; name: string; packageType: string; status: string } | null;
    },
    tenant: {
      status: string;
      trialDaysLeft: number;
      trialExpired: boolean;
      limits: { trialDays: number; maxTrialUsers: number; maxTrialProducts: number };
      usage: { users: number; products: number };
    } | null | undefined,
    branchId: string,
    registerId: string,
    role: string
  ) {
    const ws = await api<{ token: string; branchId: string; registerId: string }>("/auth/workspace", {
      method: "POST",
      body: JSON.stringify({ branchId, registerId }),
      headers: { Authorization: `Bearer ${token}` },
    });
    setAuth(ws.token, user, tenant ?? null);
    setWorkspace(ws.token, ws.branchId, ws.registerId);
    if (role === "platform_admin") navigate("/platform");
    else if (role === "admin") navigate("/dashboard");
    else navigate("/");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api<{
        token: string;
        user: {
          id: string; name: string; email: string; role: string;
          organization: { id: string; slug: string; name: string; packageType: string; status: string } | null;
        };
        session: {
          branchId: string | null;
          registerId: string | null;
          branches: SessionBranch[];
          tenant: Parameters<ReturnType<typeof useAuth.getState>["setAuth"]>[2];
        };
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (res.user.role === "platform_admin") {
        setAuth(res.token, res.user, null);
        navigate("/platform");
        return;
      }

      const { branches, branchId, registerId, tenant } = res.session;
      const needsPicker =
        branches.length > 1 ||
        (branches.length === 1 && branches[0].registers.length > 1) ||
        !branchId ||
        !registerId;

      if (needsPicker && branches.length > 0) {
        setPicker({
          token: res.token,
          user: res.user,
          tenant: tenant ?? null,
          branches,
          branchId,
          registerId,
          role: res.user.role,
        });
        return;
      }

      if (branchId && registerId) {
        await finishLogin(res.token, res.user, tenant ?? null, branchId, registerId, res.user.role);
      } else {
        setError("Şube veya kasa bulunamadı");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giriş başarısız");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {picker && (
        <BranchRegisterPicker
          branches={picker.branches}
          initialBranchId={picker.branchId}
          initialRegisterId={picker.registerId}
          onConfirm={async (branchId, registerId) => {
            setLoading(true);
            try {
              await finishLogin(picker.token, picker.user, picker.tenant, branchId, registerId, picker.role);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Oturum başlatılamadı");
            } finally {
              setLoading(false);
              setPicker(null);
            }
          }}
        />
      )}

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950">
        <form onSubmit={handleLogin} className="w-full max-w-md bg-slate-900/80 border border-slate-700 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-teal-400">Aura Barkod</h1>
          <p className="text-slate-400 mt-2">{tenantBrand ? `${tenantBrand} — Giriş` : "Perakende Satış Sistemi"}</p>
          </div>

          <div className="flex gap-2 mb-6 flex-wrap">
            {DEMO_ACCOUNTS.map((a, i) => (
              <button
                key={a.email}
                type="button"
                onClick={() => selectDemo(i)}
                className={`flex-1 min-w-[80px] text-xs py-2 px-2 rounded-lg border transition ${email === a.email ? "border-teal-500 bg-teal-900/40 text-teal-300" : "border-slate-700 text-slate-400 hover:border-slate-500"}`}
              >
                {a.label}
              </button>
            ))}
          </div>

          {error && <div className="bg-red-500/20 border border-red-500 text-red-300 rounded-lg p-3 mb-4 text-sm">{error}</div>}
          <label className="block mb-4">
            <span className="text-sm text-slate-400">E-posta</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 focus:outline-none focus:border-teal-500" />
          </label>
          <label className="block mb-6">
            <span className="text-sm text-slate-400">Şifre</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 focus:outline-none focus:border-teal-500" />
          </label>
          <button type="submit" disabled={loading} className="w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-50 rounded-lg py-3 font-semibold transition">
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
          <p className="text-center text-sm text-slate-500 mt-6">
            Yeni market veya mağaza mı açıyorsunuz?{" "}
            <Link to="/register" className="text-teal-400 hover:text-teal-300 font-medium">İşletme kaydı oluşturun</Link>
          </p>
        </form>
      </div>
    </>
  );
}
