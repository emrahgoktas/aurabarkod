import { useState } from "react";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { SEO } from "../components/SEO";
import { Button, PageHero } from "../components/ui";
import { SITE } from "../lib/site";

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "" });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(`Aura Barkod İletişim — ${form.company || form.name}`);
    const body = encodeURIComponent(
      `Ad: ${form.name}\nE-posta: ${form.email}\nİşletme: ${form.company}\n\n${form.message}`
    );
    window.location.href = `mailto:${SITE.email}?subject=${subject}&body=${body}`;
    setSent(true);
  }

  return (
    <>
      <SEO
        title="İletişim — Destek ve Satış"
        description="Aura Barkod ile iletişime geçin. Demo talebi, kurumsal plan, teknik destek ve iş ortaklığı için bize ulaşın."
        path="/iletisim"
      />
      <PageHero
        badge="İletişim"
        title="Size nasıl yardımcı olabiliriz?"
        subtitle="Demo talebi, kurumsal plan veya teknik destek — ekibimiz en kısa sürede dönüş yapar."
      />
      <section className="pb-24 px-4">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-5 gap-12">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-start gap-4 p-5 rounded-xl border border-white/5 bg-slate-900/40">
              <Mail size={20} className="text-aura-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-white text-sm">E-posta</h3>
                <a href={`mailto:${SITE.email}`} className="text-aura-400 text-sm hover:underline">{SITE.email}</a>
              </div>
            </div>
            <div className="flex items-start gap-4 p-5 rounded-xl border border-white/5 bg-slate-900/40">
              <Phone size={20} className="text-aura-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-white text-sm">Telefon</h3>
                <a href={`tel:${SITE.phone.replace(/\s/g, "")}`} className="text-slate-400 text-sm">{SITE.phone}</a>
              </div>
            </div>
            <div className="flex items-start gap-4 p-5 rounded-xl border border-white/5 bg-slate-900/40">
              <MapPin size={20} className="text-aura-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-white text-sm">Adres</h3>
                <p className="text-slate-400 text-sm">{SITE.address}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-4 p-8 rounded-2xl border border-white/10 bg-slate-900/50">
            {sent ? (
              <div className="text-center py-12">
                <p className="text-emerald-400 font-medium mb-2">Teşekkürler!</p>
                <p className="text-slate-400 text-sm">E-posta istemciniz açıldı. Gönder butonuna tıklayarak mesajınızı iletebilirsiniz.</p>
              </div>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-xs text-slate-500 mb-1 block">Ad Soyad *</span>
                    <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-aura-600" />
                  </label>
                  <label className="block">
                    <span className="text-xs text-slate-500 mb-1 block">E-posta *</span>
                    <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-aura-600" />
                  </label>
                </div>
                <label className="block">
                  <span className="text-xs text-slate-500 mb-1 block">İşletme Adı</span>
                  <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-aura-600" />
                </label>
                <label className="block">
                  <span className="text-xs text-slate-500 mb-1 block">Mesajınız *</span>
                  <textarea required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-aura-600 resize-none" />
                </label>
                <Button type="submit" className="w-full sm:w-auto">
                  <Send size={16} /> Gönder
                </Button>
              </>
            )}
          </form>
        </div>
      </section>
    </>
  );
}
