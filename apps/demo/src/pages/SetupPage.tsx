import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Store, Shirt, ChevronRight, ChevronLeft, Check, Building2 } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../stores/pos";
import { PACKAGE_FEATURES, PACKAGE_LABELS } from "../lib/packageMeta";
import type { PackageType } from "../lib/shared";

const STEPS = ["Paket", "İşletme", "Vergi", "Yönetici", "Özet"];

function slugPreview(name: string) {
  const map: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" };
  return name
    .split("")
    .map((c) => map[c.toLowerCase()] || c)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export default function SetupPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [slugStatus, setSlugStatus] = useState<"idle" | "ok" | "taken">("idle");
  const setAuth = useAuth((s) => s.setAuth);
  const setRegister = useAuth((s) => s.setRegister);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    packageType: "MARKET" as PackageType,
    organizationName: "",
    slug: "",
    email: "",
    branchName: "Merkez Şube",
    address: "",
    phone: "",
    taxNumber: "",
    taxOffice: "",
    mersisNo: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    adminPassword2: "",
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  useEffect(() => {
    if (!form.slug || form.slug.length < 3) {
      setSlugStatus("idle");
      return;
    }
    const t = setTimeout(() => {
      api<{ available: boolean }>(`/tenants/check-slug?slug=${encodeURIComponent(form.slug)}`)
        .then((r) => setSlugStatus(r.available ? "ok" : "taken"))
        .catch(() => setSlugStatus("idle"));
    }, 400);
    return () => clearTimeout(t);
  }, [form.slug]);

  function next() {
    setError("");
    if (step === 1) {
      if (!form.organizationName.trim()) { setError("İşletme adı zorunlu"); return; }
      if (!form.email.trim()) { setError("İşletme e-postası zorunlu"); return; }
    }
    if (step === 2) {
      if (!form.taxNumber.trim() || form.taxNumber.length < 10) { setError("Geçerli VKN/TCKN girin"); return; }
      if (!form.taxOffice.trim()) { setError("Vergi dairesi zorunlu"); return; }
    }
    if (step === 3) {
      if (!form.adminName.trim() || !form.adminEmail.trim()) { setError("Ad ve e-posta zorunlu"); return; }
      if (form.adminPassword.length < 6) { setError("Şifre en az 6 karakter"); return; }
      if (form.adminPassword !== form.adminPassword2) { setError("Şifreler eşleşmiyor"); return; }
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function complete() {
    setLoading(true);
    setError("");
    try {
      const res = await api<{
        token: string;
        user: Parameters<typeof setAuth>[1];
        branchId: string;
        registerId: string;
        message: string;
        tenant?: Parameters<typeof setAuth>[2];
      }>("/tenants/register", {
        method: "POST",
        body: JSON.stringify({
          packageType: form.packageType,
          organizationName: form.organizationName,
          slug: form.slug || undefined,
          email: form.email,
          taxNumber: form.taxNumber,
          taxOffice: form.taxOffice,
          mersisNo: form.mersisNo || undefined,
          branchName: form.branchName,
          address: form.address || undefined,
          phone: form.phone || undefined,
          adminName: form.adminName,
          adminEmail: form.adminEmail,
          adminPassword: form.adminPassword,
        }),
      });
      setAuth(res.token, res.user, res.tenant ?? null);
      setRegister(res.branchId, res.registerId);
      navigate("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt başarısız");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-teal-400 mb-2">
            <Building2 size={24} />
            <span className="text-sm font-medium tracking-wide">AURA BARKOD · YENİ İŞLETME KAYDI</span>
          </div>
          <h1 className="text-3xl font-bold text-white">İşletmenizi kurun</h1>
          <p className="text-slate-400 mt-2">Vergi levha bilgilerinizi girin — dakikalar içinde kasanız hazır</p>
        </div>

        <div className="flex justify-center gap-1 mb-8 flex-wrap">
          {STEPS.map((label, i) => (
            <div key={label} className={`flex items-center gap-1 text-xs ${i <= step ? "text-teal-400" : "text-slate-600"}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center border ${i < step ? "bg-teal-600 border-teal-600 text-white" : i === step ? "border-teal-500" : "border-slate-700"}`}>
                {i < step ? <Check size={14} /> : i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
              {i < STEPS.length - 1 && <ChevronRight size={14} className="text-slate-700" />}
            </div>
          ))}
        </div>

        <div className="bg-slate-900/90 border border-slate-700 rounded-2xl p-8 shadow-2xl">
          {error && <div className="mb-4 bg-red-900/30 border border-red-700 text-red-300 rounded-lg p-3 text-sm">{error}</div>}

          {step === 0 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-2">İşletme tipinizi seçin</h2>
              <p className="text-slate-400 text-sm mb-6">Market veya giyim modülü — kasa ve raporlar buna göre yapılandırılır.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(["MARKET", "RETAIL"] as PackageType[]).map((pkg) => {
                  const meta = PACKAGE_LABELS[pkg];
                  const Icon = pkg === "MARKET" ? Store : Shirt;
                  const selected = form.packageType === pkg;
                  return (
                    <button
                      key={pkg}
                      type="button"
                      onClick={() => set("packageType", pkg)}
                      className={`text-left p-5 rounded-xl border-2 transition ${selected ? "border-teal-500 bg-teal-900/30" : "border-slate-700 hover:border-slate-500"}`}
                    >
                      <Icon size={28} className={selected ? "text-teal-400" : "text-slate-500"} />
                      <div className="font-bold text-lg mt-3">{meta.title}</div>
                      <div className="text-sm text-slate-400">{meta.subtitle}</div>
                      <ul className="mt-3 space-y-1">
                        {PACKAGE_FEATURES[pkg].slice(0, 4).map((f) => (
                          <li key={f} className="text-xs text-slate-500 flex items-center gap-1"><Check size={10} className="text-teal-600" /> {f}</li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white mb-4">İşletme bilgileri</h2>
              <Field label="İşletme / Mağaza Adı *" value={form.organizationName} onChange={(v) => set("organizationName", v)} />
              <Field
                label="Tenant kodu (slug)"
                value={form.slug}
                onChange={(v) => set("slug", v.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                hint={form.slug ? undefined : `Boş bırakılırsa otomatik: ${slugPreview(form.organizationName) || "..."}`}
                suffix={slugStatus === "ok" ? "✓ Müsait" : slugStatus === "taken" ? "✗ Dolu" : undefined}
              />
              <Field label="İşletme E-postası *" value={form.email} onChange={(v) => set("email", v)} type="email" />
              <Field label="Şube Adı" value={form.branchName} onChange={(v) => set("branchName", v)} />
              <Field label="Adres" value={form.address} onChange={(v) => set("address", v)} />
              <Field label="Telefon" value={form.phone} onChange={(v) => set("phone", v)} />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white mb-2">Vergi levha bilgileri</h2>
              <p className="text-slate-400 text-sm mb-4">Fiş ve e-fatura entegrasyonu için zorunlu alanlar</p>
              <Field label="Vergi Kimlik No (VKN/TCKN) *" value={form.taxNumber} onChange={(v) => set("taxNumber", v.replace(/\D/g, "").slice(0, 11))} />
              <Field label="Vergi Dairesi *" value={form.taxOffice} onChange={(v) => set("taxOffice", v)} />
              <Field label="MERSİS No" value={form.mersisNo} onChange={(v) => set("mersisNo", v)} hint="Ticaret sicil kaydı varsa" />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white mb-4">Yönetici hesabı</h2>
              <p className="text-slate-400 text-sm -mt-2 mb-4">Bu hesapla giriş yapıp kasiyer ve şube ekleyebilirsiniz.</p>
              <Field label="Ad Soyad *" value={form.adminName} onChange={(v) => set("adminName", v)} />
              <Field label="E-posta *" value={form.adminEmail} onChange={(v) => set("adminEmail", v)} type="email" />
              <Field label="Şifre *" value={form.adminPassword} onChange={(v) => set("adminPassword", v)} type="password" />
              <Field label="Şifre Tekrar *" value={form.adminPassword2} onChange={(v) => set("adminPassword2", v)} type="password" />
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Kayıt özeti</h2>
              <div className="bg-slate-800 rounded-xl p-4 space-y-2 text-sm">
                <Row label="Paket" value={PACKAGE_LABELS[form.packageType].title} />
                <Row label="İşletme" value={form.organizationName} />
                <Row label="VKN" value={form.taxNumber} />
                <Row label="Vergi Dairesi" value={form.taxOffice} />
                <Row label="Şube" value={form.branchName} />
                <Row label="Yönetici" value={`${form.adminName} (${form.adminEmail})`} />
              </div>
              <div className="mt-4 p-3 bg-teal-900/20 border border-teal-800 rounded-lg text-teal-300 text-sm">
                Deneme süresi başlar — modüller: {PACKAGE_FEATURES[form.packageType].join(" · ")}
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8">
            <button type="button" onClick={() => (step === 0 ? navigate("/login") : setStep((s) => s - 1))}
              className="flex items-center gap-1 text-slate-400 hover:text-white px-4 py-2">
              <ChevronLeft size={18} /> {step === 0 ? "Giriş" : "Geri"}
            </button>
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={next} className="bg-teal-600 hover:bg-teal-500 px-6 py-2.5 rounded-lg font-semibold flex items-center gap-1">
                İleri <ChevronRight size={18} />
              </button>
            ) : (
              <button type="button" onClick={complete} disabled={loading} className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 px-8 py-2.5 rounded-lg font-bold">
                {loading ? "Kuruluyor..." : "İşletmeyi Oluştur"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", hint, suffix }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; hint?: string; suffix?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm text-slate-400">{label}</span>
      <div className="relative mt-1">
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 focus:outline-none focus:border-teal-500" />
        {suffix && <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${suffix.startsWith("✓") ? "text-teal-400" : "text-red-400"}`}>{suffix}</span>}
      </div>
      {hint && <span className="text-xs text-slate-500 mt-1 block">{hint}</span>}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 border-b border-slate-700 last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-200 font-medium text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}
