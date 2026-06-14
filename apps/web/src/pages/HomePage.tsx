import { Link } from "react-router-dom";
import {
  Store, Shirt, Cloud, BarChart3, Wifi, Shield, Zap, Users,
  ArrowRight, CheckCircle2, Star,
} from "lucide-react";
import { SEO, organizationJsonLd, softwareJsonLd } from "../components/SEO";
import { Button, CTA } from "../components/ui";
import { SITE } from "../lib/site";

const FEATURES = [
  { icon: Zap, title: "Saniyeler içinde kurulum", desc: "Vergi levha bilgilerinizi girin, market veya giyim modülünü seçin — dakikalar içinde kasanız hazır." },
  { icon: Cloud, title: "Bulut SaaS mimarisi", desc: "Her işletme kendi tenant alanında. Merkez panelden yönetim, otomatik yedekleme ve güvenli veri izolasyonu." },
  { icon: Wifi, title: "Offline çalışır", desc: "İnternet kesilse bile satış devam eder. Bağlantı gelince otomatik senkron." },
  { icon: BarChart3, title: "Anlık raporlar", desc: "Günlük, aylık, yıllık ciro. Z raporu, kampanya ROI ve borçlu müşteri takibi." },
  { icon: Shield, title: "KVKK uyumlu", desc: "Veriler Türkiye'de barındırılır. Rol bazlı erişim ve tenant izolasyonu." },
  { icon: Users, title: "Ekip yönetimi", desc: "Admin ve kasiyer rolleri. Şube ve kasa bazlı yetkilendirme." },
];

const MODULES = [
  {
    icon: Store,
    title: "Market Modülü",
    color: "emerald",
    items: ["Terazi barkod", "Veresiye / cari", "Tedarikçi faturası → stok", "F1-F8 kısayollar", "Düşük stok uyarısı"],
    to: "/market",
  },
  {
    icon: Shirt,
    title: "Giyim Modülü",
    color: "purple",
    items: ["Beden / renk varyant", "Kampanya yönetimi", "Etiket yazdırma", "Sadakat puanı", "Sezonluk indirim"],
    to: "/giyim",
  },
];

const STATS = [
  { value: "14 gün", label: "Ücretsiz deneme" },
  { value: "< 5 dk", label: "Kurulum süresi" },
  { value: "%99.9", label: "Uptime hedefi" },
  { value: "7/24", label: "Offline kasa" },
];

export default function HomePage() {
  return (
    <>
      <SEO
        title="Aura Barkod — Market ve Giyim için Bulut POS"
        description="Türkiye'nin modern bulut tabanlı barkodlu satış sistemi. Market ve giyim mağazaları için kasa, stok, veresiye, e-fatura. 14 gün ücretsiz deneyin."
        path="/"
        jsonLd={[organizationJsonLd(), softwareJsonLd()]}
      />

      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] opacity-40" />
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-aura-600/15 rounded-full blur-[100px] animate-pulse-soft" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[80px]" />

        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative py-20">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-aura-300 bg-aura-950/80 border border-aura-800/50 px-4 py-2 rounded-full mb-6">
              <Star size={12} className="fill-aura-400 text-aura-400" />
              Yeni nesil bulut POS — Multi-tenant SaaS
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold text-white leading-[1.08] tracking-tight mb-6">
              Mağazanızı{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-aura-300 to-emerald-400">
                tek platformda
              </span>{" "}
              yönetin
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed mb-8 max-w-xl">
              Aura Barkod; market ve giyim perakendecileri için barkodlu kasa, stok, veresiye, e-fatura ve raporlama.
              Yarın yeni şubenizi açın — bugün kayıt olun.
            </p>
            <div className="flex flex-wrap gap-4 mb-10">
              <Button href={`${SITE.appUrl}/register`}>
                Ücretsiz Başla <ArrowRight size={18} />
              </Button>
              <Button to="/fiyatlandirma" variant="secondary">Fiyatları Gör</Button>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-slate-500">
              {["Kredi kartı gerekmez", "14 gün deneme", "İptal kolaylığı"].map((t) => (
                <span key={t} className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-aura-500" />{t}</span>
              ))}
            </div>
          </div>

          {/* Mock POS preview */}
          <div className="relative animate-fade-up lg:delay-200 hidden lg:block">
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur shadow-2xl shadow-black/50 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-slate-900">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-xs text-slate-500">Kasa — Yılmaz Market</span>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-4 gap-2">
                  {["F1 Ekmek", "F2 Süt", "F3 Su", "F4 Çikolata"].map((f) => (
                    <div key={f} className="bg-slate-800 rounded-lg p-3 text-center text-xs text-slate-300 border border-slate-700">{f}</div>
                  ))}
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 space-y-2">
                  {[{ n: "Ekmek", p: "₺15" }, { n: "Süt 1L", p: "₺45" }, { n: "Su 1.5L", p: "₺12" }].map((i) => (
                    <div key={i.n} className="flex justify-between text-sm">
                      <span className="text-slate-300">{i.n}</span>
                      <span className="text-aura-400 font-medium">{i.p}</span>
                    </div>
                  ))}
                  <div className="border-t border-slate-700 pt-2 flex justify-between font-bold text-white">
                    <span>Toplam</span><span className="text-aura-400">₺72,00</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {["Nakit", "Kart", "QR", "Veresiye"].map((p) => (
                    <div key={p} className="bg-aura-900/40 border border-aura-800/50 rounded-lg py-2 text-center text-xs text-aura-300">{p}</div>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 bg-emerald-900/80 border border-emerald-700/50 rounded-xl px-4 py-3 text-sm shadow-xl animate-float">
              <span className="text-emerald-300 font-medium">+₺4.850</span>
              <span className="text-slate-400 ml-2">bugünkü ciro</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-white/5 bg-slate-900/30 py-12 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-white mb-1">{s.value}</div>
              <div className="text-sm text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Neden Aura Barkod?</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Küçük marketten zincir mağazaya — ölçeklenebilir SaaS altyapısı.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="group p-6 rounded-2xl border border-white/5 bg-slate-900/40 hover:border-aura-800/50 hover:bg-slate-900/60 transition">
                <div className="w-11 h-11 rounded-xl bg-aura-900/50 border border-aura-800/30 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                  <f.icon size={20} className="text-aura-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules */}
      <section className="py-24 px-4 bg-slate-900/20">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">
          {MODULES.map((m) => (
            <div key={m.title} className={`rounded-2xl border p-8 ${m.color === "emerald" ? "border-emerald-800/40 bg-emerald-950/20" : "border-purple-800/40 bg-purple-950/20"}`}>
              <m.icon size={32} className={m.color === "emerald" ? "text-emerald-400" : "text-purple-400"} />
              <h3 className="text-2xl font-bold text-white mt-4 mb-4">{m.title}</h3>
              <ul className="space-y-2 mb-6">
                {m.items.map((i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-400">
                    <CheckCircle2 size={14} className={m.color === "emerald" ? "text-emerald-500" : "text-purple-500"} />{i}
                  </li>
                ))}
              </ul>
              <Link to={m.to} className={`inline-flex items-center gap-1 text-sm font-medium ${m.color === "emerald" ? "text-emerald-400 hover:text-emerald-300" : "text-purple-400 hover:text-purple-300"}`}>
                Detaylı incele <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Social proof */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={18} className="fill-amber-400 text-amber-400" />)}
          </div>
          <blockquote className="text-xl sm:text-2xl text-slate-300 font-medium leading-relaxed mb-6">
            "Kurulum 10 dakika sürdü. Ayşe kasiyer olarak eklendi, aynı gün satışa başladık. Veresiye takibi hayat kurtardı."
          </blockquote>
          <cite className="text-sm text-slate-500 not-italic">— Mehmet Y., Market işletmecisi · İstanbul</cite>
        </div>
      </section>

      <CTA title="Mağazanızı bugün dijitalleştirin" subtitle="14 gün ücretsiz deneyin. Kredi kartı gerekmez. İstediğiniz zaman iptal edin." />
    </>
  );
}
