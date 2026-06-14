import { SEO } from "../components/SEO";
import { PageHero } from "../components/ui";
import { SITE } from "../lib/site";

export default function TermsPage() {
  return (
    <>
      <SEO
        title="Kullanım Koşulları — Hizmet Sözleşmesi"
        description="Aura Barkod kullanım koşulları ve hizmet sözleşmesi. Abonelik, deneme süresi, kullanıcı yükümlülükleri ve sorumluluk sınırları."
        path="/kullanim-kosullari"
      />
      <PageHero badge="Yasal" title="Kullanım Koşulları" subtitle="Son güncelleme: Haziran 2026" />
      <article className="pb-24 px-4 max-w-3xl mx-auto prose prose-invert prose-slate prose-headings:text-white">
        <h2>1. Taraflar ve Kabul</h2>
        <p>
          Bu sözleşme, {SITE.legalName} ("Sağlayıcı") ile Aura Barkod platformunu kullanan işletme ("Kullanıcı") arasında geçerlidir.
          Kayıt işlemini tamamlayarak bu koşulları kabul etmiş sayılırsınız.
        </p>

        <h2>2. Hizmet Tanımı</h2>
        <p>
          Aura Barkod; bulut tabanlı barkodlu satış (POS), stok, cari hesap, raporlama ve ilgili modülleri
          "olduğu gibi" SaaS modeliyle sunar. Özellikler plana göre değişebilir.
        </p>

        <h2>3. Deneme ve Abonelik</h2>
        <ul>
          <li>14 günlük deneme süresi sonunda ücretli plan seçilmezse hesap askıya alınabilir.</li>
          <li>Abonelik ücretleri aylık veya yıllık olarak faturalandırılır; KDV hariçtir.</li>
          <li>İptal, dönem sonuna kadar geçerlidir; kısmi iade yapılmaz.</li>
        </ul>

        <h2>4. Kullanıcı Yükümlülükleri</h2>
        <ul>
          <li>Doğru vergi ve işletme bilgileri sağlamak</li>
          <li>Hesap güvenliğini korumak (şifre, erişim yetkileri)</li>
          <li>Platformu yasadışı amaçlarla kullanmamak</li>
          <li>Üçüncü taraf entegrasyonlarında (e-fatura vb.) kendi yasal yükümlülüklerini yerine getirmek</li>
        </ul>

        <h2>5. Veri ve Yedekleme</h2>
        <p>
          Sağlayıcı düzenli yedekleme yapar; ancak Kullanıcı kritik verilerini periyodik olarak dışa aktarmayı önerilir.
          Veri kaybından doğan dolaylı zararlardan Sağlayıcı sorumlu tutulamaz.
        </p>

        <h2>6. Hizmet Seviyesi</h2>
        <p>
          Platform %99.9 uptime hedefiyle çalışır. Planlı bakımlar önceden duyurulur.
          Kurumsal planlarda SLA koşulları ayrıca tanımlanır.
        </p>

        <h2>7. Fikri Mülkiyet</h2>
        <p>
          Aura Barkod yazılımı, markası ve arayüzleri Sağlayıcıya aittir.
          Kullanıcının girdiği iş verileri Kullanıcıya aittir.
        </p>

        <h2>8. Sorumluluk Sınırı</h2>
        <p>
          Sağlayıcının toplam sorumluluğu, son 12 ayda ödenen abonelik bedeli ile sınırlıdır.
          Mücbir sebep hallerinde hizmet askıya alınabilir.
        </p>

        <h2>9. Uyuşmazlık</h2>
        <p>İstanbul Mahkemeleri ve İcra Daireleri yetkilidir. Türk hukuku uygulanır.</p>

        <h2>10. İletişim</h2>
        <p>Sorularınız için: <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
      </article>
    </>
  );
}
