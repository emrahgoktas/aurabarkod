import { Shirt, Tag, Layers, Percent, Gift, Printer } from "lucide-react";
import { SEO } from "../components/SEO";
import { Button, CTA, PageHero } from "../components/ui";
import { SITE } from "../lib/site";

const ITEMS = [
  { icon: Layers, title: "Beden / renk varyant", desc: "Tek ürün altında S-M-L-XL ve renk varyantları, ayrı barkod ve stok." },
  { icon: Percent, title: "Kampanya yönetimi", desc: "Yüzde indirim, al-X-öde-Y, sezonluk kampanyalar ve ROI raporu." },
  { icon: Tag, title: "Etiket yazdırma", desc: "Barkodlu fiyat etiketi, toplu yazdırma desteği." },
  { icon: Gift, title: "Sadakat puanı", desc: "Müşteri puan biriktirme, satışta otomatik hesaplama." },
  { icon: Printer, title: "Fiş özelleştirme", desc: "Mağaza logosu, vergi bilgileri, 58/80mm termal yazıcı." },
  { icon: Shirt, title: "Giyim odaklı kasa", desc: "Varyant barkod okuma, hızlı sepet ve karma ödeme." },
];

export default function RetailPage() {
  return (
    <>
      <SEO
        title="Giyim Mağazası POS — Beden Renk Varyantlı Kasa"
        description="Giyim ve mağaza perakendecileri için Aura Barkod: beden/renk varyant, kampanya, etiket yazdırma, sadakat puanı. Bulut giyim POS yazılımı."
        path="/giyim"
      />
      <PageHero
        badge="Giyim Modülü"
        title="Giyim mağazanız için akıllı kasa"
        subtitle="Varyant yönetimi, kampanyalar ve etiket yazdırma — butikten zincir mağazaya ölçeklenir."
      >
        <Button href={`${SITE.appUrl}/register`}>Giyim Olarak Kayıt Ol</Button>
      </PageHero>
      <section className="pb-24 px-4">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-2 gap-6">
          {ITEMS.map((f) => (
            <article key={f.title} className="p-6 rounded-2xl border border-purple-800/30 bg-purple-950/10">
              <f.icon size={24} className="text-purple-400 mb-3" />
              <h2 className="font-semibold text-white mb-2">{f.title}</h2>
              <p className="text-sm text-slate-400">{f.desc}</p>
            </article>
          ))}
        </div>
      </section>
      <CTA title="Giyim mağazanızı dijitalleştirin" />
    </>
  );
}
