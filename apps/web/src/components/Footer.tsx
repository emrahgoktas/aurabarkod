import { Link } from "react-router-dom";
import { NAV } from "../lib/site";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-slate-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-aura-700 flex items-center justify-center text-xs font-bold text-white">AB</div>
            <span className="font-semibold text-white">Aura Barkod</span>
          </div>
          <p className="text-slate-500 text-sm leading-relaxed max-w-sm">
            Türkiye'nin modern bulut POS platformu. Market ve giyim mağazaları için kasa, stok, veresiye ve raporlama — tek abonelikte.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white mb-4">Ürün</h4>
          <ul className="space-y-2">
            {NAV.map((n) => (
              <li key={n.to}><Link to={n.to} className="text-sm text-slate-500 hover:text-aura-400 transition">{n.label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white mb-4">Yasal</h4>
          <ul className="space-y-2 text-sm text-slate-500">
            <li><Link to="/gizlilik" className="hover:text-aura-400 transition">Gizlilik Politikası</Link></li>
            <li><Link to="/kullanim-kosullari" className="hover:text-aura-400 transition">Kullanım Koşulları</Link></li>
            <li><Link to="/iletisim" className="hover:text-aura-400 transition">İletişim</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5 py-6 text-center text-xs text-slate-600">
        © {new Date().getFullYear()} Aura Barkod. Tüm hakları saklıdır.
      </div>
    </footer>
  );
}
