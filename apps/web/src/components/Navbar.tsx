import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { NAV, SITE } from "../lib/site";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-aura-500 to-aura-700 flex items-center justify-center font-bold text-white text-sm shadow-lg shadow-aura-900/40 group-hover:scale-105 transition">
            AB
          </div>
          <span className="font-semibold text-white tracking-tight">Aura Barkod</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="px-3 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition">
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <a href={`${SITE.appUrl}/login`} className="text-sm text-slate-300 hover:text-white px-3 py-2">Giriş</a>
          <a href={`${SITE.appUrl}/register`} className="text-sm font-semibold bg-aura-600 hover:bg-aura-500 text-white px-5 py-2.5 rounded-full transition shadow-lg shadow-aura-900/30">
            Ücretsiz Dene
          </a>
        </div>

        <button type="button" className="md:hidden text-slate-300 p-2" onClick={() => setOpen(!open)} aria-label="Menü">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/5 bg-slate-950/95 px-4 py-4 space-y-1">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="block px-3 py-2.5 text-slate-300 hover:text-white rounded-lg">
              {n.label}
            </Link>
          ))}
          <a href={`${SITE.appUrl}/register`} className="block text-center mt-3 bg-aura-600 text-white py-3 rounded-xl font-semibold">
            Ücretsiz Dene
          </a>
        </div>
      )}
    </header>
  );
}
