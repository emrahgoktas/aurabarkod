import { BarChart3, Cloud, CreditCard, Package, Receipt, Shield, Smartphone, Users, Wifi, FileSpreadsheet } from "lucide-react";
import { SEO } from "../components/SEO";
import { CTA, PageHero } from "../components/ui";

const ALL = [
  { icon: Smartphone, title: "Modern kasa arayüzü", desc: "Dokunmatik uyumlu, F1-F8 kısayollar, karma ödeme, beklet sepet ve kısmi iade." },
  { icon: Package, title: "Ürün yönetimi", desc: "Barkod, terazi etiketi, toplu fiyat güncelleme, CSV içe aktarım, düşük stok uyarısı." },
  { icon: CreditCard, title: "Veresiye / cari", desc: "Müşteri hesabı, tahsilat, vade takibi, borçlu filtresi ve cari ekstre." },
  { icon: BarChart3, title: "Raporlar", desc: "Dashboard, Z raporu, kampanya ROI, günlük/aylık/yıllık ciro trendi." },
  { icon: Receipt, title: "Fiş & termal yazıcı", desc: "58/80mm ESC/POS, Epson/Star/Bixolon profilleri, vergi levha bilgileri." },
  { icon: FileSpreadsheet, title: "Muhasebe export", desc: "Logo uyumlu CSV dışa aktarım, dönemsel satış raporu." },
  { icon: Cloud, title: "Otomatik yedekleme", desc: "Tek tıkla JSON yedek, tenant bazlı veri güvenliği." },
  { icon: Wifi, title: "Offline PWA", desc: "İnternet kesilince satış devam eder, bağlantı gelince senkron." },
  { icon: Users, title: "Çoklu kullanıcı", desc: "Admin ve kasiyer rolleri, şube/kasa seçimi, ekip yönetimi." },
  { icon: Shield, title: "Güvenlik", desc: "Tenant izolasyonu, JWT oturum, askıya alma ve trial yönetimi." },
];

export default function FeaturesPage() {
  return (
    <>
      <SEO
        title="Özellikler — Bulut POS Yetenekleri"
        description="Aura Barkod özellikleri: barkodlu kasa, stok, veresiye, offline sync, Z raporu, e-fatura, termal yazıcı ve çoklu şube desteği."
        path="/ozellikler"
      />
      <PageHero
        badge="Özellikler"
        title="Perakende için ihtiyacınız olan her şey"
        subtitle="Tek abonelikte kasa, stok, cari, rapor ve entegrasyon. Modüler yapı ile sadece ihtiyacınız olanı kullanın."
      />
      <section className="pb-24 px-4">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-2 gap-6">
          {ALL.map((f) => (
            <article key={f.title} className="flex gap-4 p-6 rounded-2xl border border-white/5 bg-slate-900/40">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-aura-900/50 flex items-center justify-center">
                <f.icon size={18} className="text-aura-400" />
              </div>
              <div>
                <h2 className="font-semibold text-white mb-1">{f.title}</h2>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <CTA title="Tüm özellikleri 14 gün deneyin" />
    </>
  );
}
