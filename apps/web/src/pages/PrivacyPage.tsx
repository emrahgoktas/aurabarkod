import { SEO } from "../components/SEO";
import { PageHero } from "../components/ui";
import { SITE } from "../lib/site";

export default function PrivacyPage() {
  return (
    <>
      <SEO
        title="Gizlilik Politikası — KVKK"
        description="Aura Barkod gizlilik politikası ve KVKK aydınlatma metni. Kişisel verilerinizin işlenmesi, saklanması ve haklarınız."
        path="/gizlilik"
      />
      <PageHero badge="Yasal" title="Gizlilik Politikası" subtitle={`Son güncelleme: Haziran 2026`} />
      <article className="pb-24 px-4 max-w-3xl mx-auto prose prose-invert prose-slate prose-headings:text-white">
        <h2>1. Veri Sorumlusu</h2>
        <p>
          {SITE.legalName} ("Aura Barkod"), 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusudur.
          İletişim: <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
        </p>

        <h2>2. Toplanan Veriler</h2>
        <p>Hizmet kapsamında aşağıdaki veri kategorileri işlenebilir:</p>
        <ul>
          <li>Kimlik ve iletişim bilgileri (ad, e-posta, telefon)</li>
          <li>İşletme bilgileri (ünvan, vergi numarası, vergi dairesi, adres)</li>
          <li>Kullanım ve işlem verileri (satış kayıtları, stok hareketleri, oturum logları)</li>
          <li>Teknik veriler (IP adresi, tarayıcı bilgisi, cihaz tanımlayıcıları)</li>
        </ul>

        <h2>3. İşleme Amaçları</h2>
        <ul>
          <li>SaaS hizmetinin sunulması ve sözleşmenin ifası</li>
          <li>Müşteri desteği ve teknik yardım</li>
          <li>Güvenlik, dolandırıcılık önleme ve yasal yükümlülükler</li>
          <li>Hizmet iyileştirme ve anonim istatistiksel analiz</li>
        </ul>

        <h2>4. Veri Aktarımı</h2>
        <p>
          Verileriniz Türkiye'deki sunucularda barındırılır. Yasal zorunluluk veya açık rızanız dışında üçüncü taraflarla paylaşılmaz.
          Altyapı sağlayıcılarımızla yapılan sözleşmelerde veri işleme şartları uygulanır.
        </p>

        <h2>5. Saklama Süresi</h2>
        <p>
          Veriler, hizmet süresi boyunca ve yasal saklama yükümlülükleri çerçevesinde muhafaza edilir.
          Hesap silme talebinde, yasal zorunluluklar hariç veriler makul sürede silinir veya anonimleştirilir.
        </p>

        <h2>6. Haklarınız</h2>
        <p>KVKK md. 11 kapsamında; bilgi talep etme, düzeltme, silme, itiraz ve şikâyet haklarına sahipsiniz.
          Taleplerinizi {SITE.email} adresine iletebilirsiniz.</p>

        <h2>7. Çerezler</h2>
        <p>
          Web sitemizde yalnızca temel işlevsellik için gerekli çerezler kullanılır.
          Uygulama oturumu için güvenli token mekanizması tercih edilir.
        </p>
      </article>
    </>
  );
}
