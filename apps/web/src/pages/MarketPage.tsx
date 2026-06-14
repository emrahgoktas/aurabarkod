import { Store, Scale, Truck, Users, AlertTriangle, Keyboard } from "lucide-react";
import { SEO } from "../components/SEO";
import { Button, CTA, PageHero } from "../components/ui";
import { SITE } from "../lib/site";

const ITEMS = [
  { icon: Scale, title: "Terazi barkod desteği", desc: "27xxxxxxxxx formatında gramajlı ürünler otomatik parse edilir." },
  { icon: Users, title: "Veresiye / cari hesap", desc: "Müşteri borç takibi, tahsilat, vade uyarıları ve cari ekstre." },
  { icon: Truck, title: "Tedarikçi faturası", desc: "Alış faturası girişi ile stok otomatik artar, yeni ürün oluşturulur." },
  { icon: Keyboard, title: "F1-F8 kısayollar", desc: "En çok satan ürünler tek tuşla sepete eklenir." },
  { icon: AlertTriangle, title: "Düşük stok uyarısı", desc: "Minimum stok altına düşen ürünler dashboard ve listede işaretlenir." },
  { icon: Store, title: "Market odaklı kasa", desc: "Hızlı barkod okuma, ağırlıklı ürün, nakit/kart/QR/veresiye ödeme." },
];

export default function MarketPage() {
  return (
    <>
      <SEO
        title="Market POS Yazılımı — Barkodlu Kasa Sistemi"
        description="Marketler için Aura Barkod: terazi barkod, veresiye, tedarikçi faturası, F1-F8 kısayollar, düşük stok uyarısı. Bulut tabanlı market POS."
        path="/market"
      />
      <PageHero
        badge="Market Modülü"
        title="Marketiniz için özel tasarlandı"
        subtitle="Bakkal, süpermarket, mini market — hızlı kasa, veresiye takibi ve tedarikçi entegrasyonu tek platformda."
      >
        <Button href={`${SITE.appUrl}/register`}>Market Olarak Kayıt Ol</Button>
      </PageHero>
      <section className="pb-24 px-4">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-2 gap-6">
          {ITEMS.map((f) => (
            <article key={f.title} className="p-6 rounded-2xl border border-emerald-800/30 bg-emerald-950/10">
              <f.icon size={24} className="text-emerald-400 mb-3" />
              <h2 className="font-semibold text-white mb-2">{f.title}</h2>
              <p className="text-sm text-slate-400">{f.desc}</p>
            </article>
          ))}
        </div>
      </section>
      <CTA title="Marketinizi 5 dakikada kurun" subtitle="Vergi levha bilgilerinizi girin, Market modülünü seçin, satışa başlayın." />
    </>
  );
}
