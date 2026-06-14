import { Check } from "lucide-react";
import { SEO } from "../components/SEO";
import { Button, CTA, PageHero } from "../components/ui";
import { PLANS, SITE } from "../lib/site";

export default function PricingPage() {
  return (
    <>
      <SEO
        title="Fiyatlandırma — Şeffaf ve Ölçeklenebilir Planlar"
        description="Aura Barkod fiyatları: 14 gün ücretsiz deneme, Başlangıç ₺499/ay, Pro ₺999/ay, Kurumsal ₺2499/ay. Gizli ücret yok."
        path="/fiyatlandirma"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: "Aura Barkod",
          offers: PLANS.filter((p) => p.price > 0).map((p) => ({
            "@type": "Offer",
            name: p.name,
            price: p.price,
            priceCurrency: "TRY",
          })),
        }}
      />
      <PageHero
        badge="Fiyatlandırma"
        title="Şeffaf fiyat, gizli ücret yok"
        subtitle="14 gün ücretsiz deneyin. İşletmeniz büyüdükçe planınızı yükseltin."
      />
      <section className="pb-24 px-4">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANS.map((p) => (
            <article
              key={p.id}
              className={`relative rounded-2xl border p-6 flex flex-col ${p.highlight ? "border-aura-500 bg-aura-950/40 shadow-xl shadow-aura-900/20 scale-[1.02]" : "border-white/10 bg-slate-900/40"}`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold bg-aura-600 text-white px-3 py-1 rounded-full">
                  En popüler
                </span>
              )}
              <h2 className="text-lg font-bold text-white">{p.name}</h2>
              <p className="text-xs text-slate-500 mt-1 mb-4">{p.desc}</p>
              <div className="mb-6">
                <span className="text-3xl font-bold text-white">{p.price === 0 ? "Ücretsiz" : `₺${p.price}`}</span>
                {p.price > 0 && <span className="text-slate-500 text-sm">{p.period}</span>}
                {p.price === 0 && <span className="text-slate-500 text-sm block">{p.period}</span>}
              </div>
              <ul className="space-y-2 mb-8 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-400">
                    <Check size={14} className="text-aura-500 shrink-0 mt-0.5" />{f}
                  </li>
                ))}
              </ul>
              <Button
                href={p.id === "ENTERPRISE" ? "/iletisim" : `${SITE.appUrl}/register`}
                variant={p.highlight ? "primary" : "secondary"}
                className="w-full"
              >
                {p.cta}
              </Button>
            </article>
          ))}
        </div>
        <p className="text-center text-sm text-slate-500 mt-10 max-w-xl mx-auto">
          Tüm fiyatlara KDV dahil değildir. Kurumsal planlarda özel fiyatlandırma ve SLA seçenekleri mevcuttur.
        </p>
      </section>
      <CTA title="Hâlâ kararsız mısınız?" subtitle="14 gün boyunca tüm özellikleri ücretsiz deneyin — kredi kartı gerekmez." />
    </>
  );
}
