import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../stores/pos";
import { formatMoney } from "../lib/format";

interface ZReport {
  totalSales: number | string;
  totalRefunds: number | string;
  cashTotal: number | string;
  cardTotal: number | string;
  qrTotal: number | string;
  creditTotal: number | string;
  saleCount: number;
  reportDate?: string;
}

interface Dashboard {
  periodLabel: string;
  revenue: number;
  saleCount: number;
  productCount: number;
  customerCount: number;
}

export default function ReportsPage() {
  const { registerId } = useAuth();
  const [zReport, setZReport] = useState<ZReport | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<Dashboard>("/reports/dashboard?period=daily").then(setDashboard).catch(() => {});
  }, []);

  async function generateZReport() {
    const { branchId, registerId } = useAuth.getState();
    setLoading(true);
    try {
      const report = await api<ZReport>("/reports/z-report", {
        method: "POST",
        body: JSON.stringify({ branchId, registerId }),
      });
      setZReport(report);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    api<ZReport | null>(`/reports/z-report/${registerId}`).then((r) => setZReport(r)).catch(() => {});
  }, [registerId]);

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6"><ArrowLeft size={18} /> Kasa</Link>
        <h1 className="text-2xl font-bold text-teal-400 mb-6">Raporlar</h1>

        {dashboard && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label={`${dashboard.periodLabel} Ciro`} value={`₺${formatMoney(dashboard.revenue)}`} />
            <StatCard label="Satış Adedi" value={String(dashboard.saleCount ?? 0)} />
            <StatCard label="Ürün Sayısı" value={String(dashboard.productCount ?? 0)} />
            <StatCard label="Müşteri" value={String(dashboard.customerCount ?? 0)} />
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2"><FileText size={20} /> Gün Sonu Z Raporu</h2>
            <button onClick={generateZReport} disabled={loading} className="bg-teal-600 hover:bg-teal-500 px-4 py-2 rounded-lg text-sm">
              {loading ? "Oluşturuluyor..." : "Z Raporu Oluştur"}
            </button>
          </div>

          {zReport ? (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Row label="Toplam Satış" value={`₺${formatMoney(zReport.totalSales)}`} />
              <Row label="İade" value={`₺${formatMoney(zReport.totalRefunds)}`} />
              <Row label="Nakit" value={`₺${formatMoney(zReport.cashTotal)}`} />
              <Row label="Kart" value={`₺${formatMoney(zReport.cardTotal)}`} />
              <Row label="QR" value={`₺${formatMoney(zReport.qrTotal)}`} />
              <Row label="Veresiye" value={`₺${formatMoney(zReport.creditTotal)}`} />
              <Row label="Satış Adedi" value={String(zReport.saleCount ?? 0)} />
            </div>
          ) : (
            <p className="text-slate-500">Henüz Z raporu oluşturulmadı.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="text-slate-400 text-sm">{label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-slate-800">
      <span className="text-slate-400">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
