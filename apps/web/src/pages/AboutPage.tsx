import { Target, Heart, Rocket, Users } from "lucide-react";
import { SEO } from "../components/SEO";
import { CTA, PageHero } from "../components/ui";

const VALUES = [
  { icon: Target, title: "Misyon", desc: "Türkiye'deki her küçük ve orta ölçekli perakendecinin, kurumsal düzeyde teknolojiye erişebilmesini sağlamak." },
  { icon: Rocket, title: "Vizyon", desc: "Market ve giyim sektöründe en güvenilir, en hızlı kurulan bulut POS platformu olmak." },
  { icon: Heart, title: "Değerler", desc: "Şeffaflık, basitlik, güvenilirlik. Gizli ücret yok, karmaşık kurulum yok." },
  { icon: Users, title: "Ekip", desc: "Ürün, mühendislik ve destek ekiplerimiz perakende saha deneyiminden besleniyor." },
];

const TIMELINE = [
  { year: "2024", event: "Aura Barkod fikri ve ilk prototip — market kasa ihtiyaçlarından doğdu." },
  { year: "2025", event: "Multi-tenant SaaS mimarisi, giyim modülü ve offline PWA yayında." },
  { year: "2026", event: "e-Fatura entegrasyonu, abonelik yönetimi ve kurumsal landing." },
];

export default function AboutPage() {
  return (
    <>
      <SEO
        title="Hakkımızda — Aura Barkod Ekibi ve Misyon"
        description="Aura Barkod, Türkiye'deki market ve giyim perakendecileri için modern bulut POS çözümü sunar. Misyonumuz, vizyonumuz ve değerlerimiz."
        path="/hakkimizda"
      />
      <PageHero
        badge="Hakkımızda"
        title="Perakendeciler için, perakendecilerle"
        subtitle="Aura Barkod; sahada yaşanan gerçek ihtiyaçlardan doğan, bulut tabanlı barkodlu satış platformudur."
      />
      <section className="pb-16 px-4">
        <div className="max-w-4xl mx-auto prose prose-invert prose-slate">
          <p className="text-slate-400 leading-relaxed text-lg">
            Geleneksel POS sistemleri pahalı, kurulumu zor ve güncellemesi yavaştır. Aura Barkod bunu değiştiriyor:
            vergi levha bilgilerinizi girin, modülünüzü seçin ve dakikalar içinde satışa başlayın. Her işletme kendi
            güvenli tenant alanında çalışır; verileriniz izole, yedekleriniz otomatik.
          </p>
        </div>
      </section>
      <section className="pb-16 px-4">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-2 gap-6">
          {VALUES.map((v) => (
            <article key={v.title} className="p-6 rounded-2xl border border-white/5 bg-slate-900/40">
              <v.icon size={24} className="text-aura-400 mb-3" />
              <h2 className="font-semibold text-white mb-2">{v.title}</h2>
              <p className="text-sm text-slate-400 leading-relaxed">{v.desc}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="pb-24 px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">Yolculuğumuz</h2>
          <div className="space-y-6">
            {TIMELINE.map((t) => (
              <div key={t.year} className="flex gap-6 items-start">
                <span className="shrink-0 w-16 text-aura-400 font-bold">{t.year}</span>
                <p className="text-slate-400 text-sm leading-relaxed pt-0.5">{t.event}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <CTA title="Bizimle büyüyün" subtitle="14 gün ücretsiz deneme ile Aura Barkod'u keşfedin." />
    </>
  );
}
