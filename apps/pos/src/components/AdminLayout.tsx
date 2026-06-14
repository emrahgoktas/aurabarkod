import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Package, Users, BarChart3, Settings, ShoppingCart, LayoutDashboard, Store, Shirt, Tag } from "lucide-react";
import { useAuth } from "../stores/pos";
import { useModules } from "../lib/modules";
import { PACKAGE_LABELS } from "../lib/packageMeta";
import PaymentAlertsBanner from "./PaymentAlertsBanner";
import TrialBanner from "./TrialBanner";
export default function AdminLayout({ children, title }: { children: React.ReactNode; title: string }) {
  const { user } = useAuth();
  const { packageType, has } = useModules();
  const loc = useLocation();
  const pkgLabel = PACKAGE_LABELS[packageType];

  const nav = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", show: has("dashboard") },
    { to: "/", icon: ShoppingCart, label: "Kasa", show: true },
    { to: "/products", icon: Package, label: "Ürünler", show: has("products") },
    { to: "/customers", icon: Users, label: has("credit_account") ? "Müşteriler / Veresiye" : "Müşteriler", show: has("customers") },
    { to: "/campaigns", icon: Tag, label: "Kampanyalar", show: has("campaigns") },
    { to: "/reports", icon: BarChart3, label: "Raporlar", show: has("z_report") || has("dashboard") },    { to: "/settings", icon: Settings, label: "Ayarlar", show: true },
  ].filter((n) => n.show);

  return (
    <div className="min-h-screen bg-slate-950">
      <TrialBanner />
      <header className="border-b border-slate-800 bg-slate-900 px-4 py-3">        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-slate-400 hover:text-white"><ArrowLeft size={20} /></Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-teal-400">{title}</h1>
                <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${packageType === "MARKET" ? "bg-emerald-900/50 text-emerald-400" : "bg-purple-900/50 text-purple-400"}`}>
                  {packageType === "MARKET" ? <Store size={10} /> : <Shirt size={10} />}
                  {pkgLabel.title} Modülü
                </span>
              </div>
              <p className="text-xs text-slate-500">{user?.organization?.name ?? "—"} · {user?.name}</p>
            </div>
          </div>
          <nav className="flex gap-1">
            {nav.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition ${loc.pathname === to ? "bg-teal-900/50 text-teal-300" : "text-slate-400 hover:bg-slate-800"}`}
              >
                <Icon size={16} /> {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-6">
        {has("credit_account") && <PaymentAlertsBanner />}
        {children}
      </main>
    </div>
  );
}
