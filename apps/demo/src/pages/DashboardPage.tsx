import { useEffect, useState } from "react";
import {
  TrendingUp, ShoppingCart, Package, Users, AlertTriangle,
  Banknote, CreditCard, QrCode, Wallet,
} from "lucide-react";
import AdminLayout from "../components/AdminLayout";
import { api } from "../lib/api";

type Period = "daily" | "monthly" | "yearly";

interface DashboardData {
  period: string;
  periodLabel: string;
  revenue: number;
  saleCount: number;
  avgBasket: number;
  payments: { cash: number; card: number; qr: number; credit: number };
  topProducts: Array<{ name: string; qty: number; revenue: number }>;
  productCount: number;
  customerCount: number;
  lowStockCount: number;
  overdueCount: number;
  totalCreditBalance: number;
  trend: Array<{ date: string; revenue: number; count: number }>;
}

const PERIODS: { id: Period; label: string }[] = [
  { id: "daily", label: "Günlük" },
  { id: "monthly", label: "Aylık" },
  { id: "yearly", label: "Yıllık" },
];

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>("daily");
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    api<DashboardData>(`/reports/dashboard?period=${period}`).then(setData).catch(() => {});
  }, [period]);

  const maxTrend = data ? Math.max(...data.trend.map((t) => t.revenue), 1) : 1;

  return (
    <AdminLayout title="Dashboard">
      <div className="flex gap-2 mb-6">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition ${period === p.id ? "bg-teal-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {!data ? (
        <div className="text-slate-400 text-center py-20">Yükleniyor...</div>
      ) : (
        <>
          <p className="text-slate-400 text-sm mb-4">{data.periodLabel} genel durum özeti</p>

          {/* KPI kartları */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Kpi icon={TrendingUp} label="Ciro" value={`₺${data.revenue.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`} color="teal" />
            <Kpi icon={ShoppingCart} label="Satış Adedi" value={String(data.saleCount)} color="blue" />
            <Kpi icon={Wallet} label="Ort. Sepet" value={`₺${data.avgBasket.toFixed(2)}`} color="purple" />
            <Kpi icon={Users} label="Müşteri" value={String(data.customerCount)} color="slate" />
          </div>

          {/* Uyarılar */}
          {(data.overdueCount > 0 || data.lowStockCount > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {data.overdueCount > 0 && (
                <div className="bg-red-900/20 border border-red-700 rounded-xl p-4 flex items-center gap-3">
                  <AlertTriangle className="text-red-400" size={24} />
                  <div>
                    <div className="font-semibold text-red-300">{data.overdueCount} vadesi geçmiş müşteri</div>
                    <div className="text-sm text-red-400">Toplam alacak: ₺{data.totalCreditBalance.toFixed(2)}</div>
                  </div>
                </div>
              )}
              {data.lowStockCount > 0 && (
                <div className="bg-amber-900/20 border border-amber-700 rounded-xl p-4 flex items-center gap-3">
                  <Package className="text-amber-400" size={24} />
                  <div>
                    <div className="font-semibold text-amber-300">{data.lowStockCount} düşük stoklu ürün</div>
                    <div className="text-sm text-amber-400">Toplam {data.productCount} aktif ürün</div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Trend grafiği */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="font-semibold text-slate-300 mb-4">
                {period === "daily" ? "Son 7 Gün" : period === "monthly" ? "Son 6 Ay" : "Son 12 Ay"}
              </h3>
              <div className="flex items-end gap-2 h-40">
                {data.trend.map((t) => (
                  <div key={t.date} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-teal-600/80 rounded-t hover:bg-teal-500 transition min-h-[4px]"
                      style={{ height: `${Math.max(4, (t.revenue / maxTrend) * 140)}px` }}
                      title={`₺${t.revenue.toFixed(2)}`}
                    />
                    <span className="text-[10px] text-slate-500 text-center leading-tight">{t.date}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ödeme dağılımı */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="font-semibold text-slate-300 mb-4">Ödeme Dağılımı</h3>
              <div className="space-y-3">
                <PayRow icon={Banknote} label="Nakit" amount={data.payments.cash} total={data.revenue} color="emerald" />
                <PayRow icon={CreditCard} label="Kart" amount={data.payments.card} total={data.revenue} color="blue" />
                <PayRow icon={QrCode} label="QR" amount={data.payments.qr} total={data.revenue} color="purple" />
                <PayRow icon={Wallet} label="Veresiye" amount={data.payments.credit} total={data.revenue} color="amber" />
              </div>
            </div>
          </div>

          {/* En çok satan */}
          <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="font-semibold text-slate-300 mb-4">En Çok Satan Ürünler</h3>
            {data.topProducts.length === 0 ? (
              <p className="text-slate-500 text-sm">Bu dönemde satış yok</p>
            ) : (
              <div className="space-y-2">
                {data.topProducts.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-4 py-2 border-b border-slate-800 last:border-0">
                    <span className="text-teal-500 font-bold w-6">{i + 1}</span>
                    <span className="flex-1 text-slate-200">{p.name}</span>
                    <span className="text-slate-400 text-sm">{p.qty} adet</span>
                    <span className="font-semibold text-teal-400">₺{p.revenue.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </AdminLayout>
  );
}

function Kpi({ icon: Icon, label, value, color }: { icon: typeof TrendingUp; label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    teal: "text-teal-400 bg-teal-900/30",
    blue: "text-blue-400 bg-blue-900/30",
    purple: "text-purple-400 bg-purple-900/30",
    slate: "text-slate-300 bg-slate-800",
  };
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className={`inline-flex p-2 rounded-lg mb-2 ${colors[color]}`}><Icon size={18} /></div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-xl font-bold mt-0.5">{value}</div>
    </div>
  );
}

function PayRow({ icon: Icon, label, amount, total, color }: {
  icon: typeof Banknote; label: string; amount: number; total: number; color: string;
}) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  const barColors: Record<string, string> = { emerald: "bg-emerald-500", blue: "bg-blue-500", purple: "bg-purple-500", amber: "bg-amber-500" };
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="flex items-center gap-1.5 text-slate-400"><Icon size={14} /> {label}</span>
        <span className="text-slate-200">₺{amount.toFixed(2)} <span className="text-slate-500">({pct.toFixed(0)}%)</span></span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${barColors[color]} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
