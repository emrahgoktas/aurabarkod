import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Banknote, ScrollText, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";
import AdminLayout from "../components/AdminLayout";
import { api } from "../lib/api";

interface Movement {
  id: string;
  date: string;
  type: string;
  label: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  receiptNo?: string;
  dueDate?: string;
  isOverdue?: boolean;
}

interface Ledger {
  customer: {
    id: string;
    name: string;
    phone?: string;
    creditLimit: number;
    currentBalance: number;
    paymentDueDate?: string;
    paymentPromiseNote?: string;
    isOverdue?: boolean;
    daysOverdue?: number;
  };
  movements: Movement[];
}

export default function CustomerLedgerPage() {
  const { id } = useParams<{ id: string }>();
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    api<Ledger>(`/customers/${id}/ledger`)
      .then(setLedger)
      .catch((e) => setError(e instanceof Error ? e.message : "Yüklenemedi"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AdminLayout title="Cari Hareketler">
        <div className="text-slate-400 text-center py-12">Yükleniyor...</div>
      </AdminLayout>
    );
  }

  if (error || !ledger) {
    return (
      <AdminLayout title="Cari Hareketler">
        <div className="text-red-400 text-center py-12">{error || "Veri bulunamadı"}</div>
        <Link to="/customers" className="text-teal-400 hover:underline">← Müşterilere dön</Link>
      </AdminLayout>
    );
  }

  const { customer, movements } = ledger;

  return (
    <AdminLayout title="Cari Hareketler">
      <Link to="/customers" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 text-sm">
        <ArrowLeft size={16} /> Müşteriler
      </Link>

      {/* Vadesi geçmiş uyarı */}
      {customer.isOverdue && (
        <div className="bg-red-900/40 border-2 border-red-500 rounded-xl p-4 mb-6 flex items-center gap-3 animate-pulse">
          <AlertTriangle size={24} className="text-red-400 shrink-0" />
          <div>
            <div className="font-bold text-red-300">VADESİ GEÇMİŞ ÖDEME</div>
            <div className="text-sm text-red-400">
              Taahhüt tarihi: {customer.paymentDueDate ? new Date(customer.paymentDueDate).toLocaleDateString("tr-TR") : "—"}
              {" "}— {customer.daysOverdue} gün gecikmiş
              {customer.paymentPromiseNote && ` · ${customer.paymentPromiseNote}`}
            </div>
          </div>
        </div>
      )}

      {/* Müşteri özeti */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h2 className="text-2xl font-bold">{customer.name}</h2>
            <p className="text-slate-400 text-sm mt-1">{customer.phone || "Telefon kayıtlı değil"}</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 mb-1">Güncel Borç</div>
            <div className={`text-3xl font-bold ${customer.currentBalance > 0 ? "text-red-400" : "text-emerald-400"}`}>
              ₺{customer.currentBalance.toFixed(2)}
            </div>
            <div className="text-xs text-slate-500 mt-1">Limit: ₺{customer.creditLimit.toFixed(0)}</div>
          </div>
        </div>

        {/* Örnek senaryo özeti */}
        {movements.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800 flex gap-6 text-sm">
            <div className="flex items-center gap-2 text-red-400">
              <TrendingUp size={16} />
              Toplam borçlanma: ₺{movements.reduce((s, m) => s + m.debit, 0).toFixed(2)}
            </div>
            <div className="flex items-center gap-2 text-emerald-400">
              <TrendingDown size={16} />
              Toplam tahsilat: ₺{movements.reduce((s, m) => s + m.credit, 0).toFixed(2)}
            </div>
            <div className="flex items-center gap-2 text-amber-400">
              <ScrollText size={16} />
              {movements.length} hareket
            </div>
          </div>
        )}
      </div>

      {/* Hareket tablosu */}
      {movements.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
          Henüz cari hareket yok. Veresiye satış veya tahsilat yapıldığında burada görünür.
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-800">
              <tr>
                <th className="text-left p-4">Tarih</th>
                <th className="text-left p-4">İşlem</th>
                <th className="text-left p-4">Açıklama</th>
                <th className="text-left p-4">Vade</th>
                <th className="text-right p-4 text-red-400">Borç (+)</th>
                <th className="text-right p-4 text-emerald-400">Alacak (-)</th>
                <th className="text-right p-4 font-semibold">Bakiye</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} className="border-t border-slate-800 hover:bg-slate-800/50">
                  <td className="p-4 text-slate-400 whitespace-nowrap">
                    {new Date(m.date).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${m.type === "DEBIT" ? "bg-red-900/40 text-red-300" : "bg-emerald-900/40 text-emerald-300"}`}>
                      {m.type === "DEBIT" ? <TrendingUp size={12} /> : <Banknote size={12} />}
                      {m.label}
                    </span>
                  </td>
                  <td className="p-4 text-slate-300">
                    {m.description}
                    {m.receiptNo && <span className="block text-xs text-slate-500 font-mono">Fiş: {m.receiptNo}</span>}
                  </td>
                  <td className="p-4 text-slate-400 text-xs whitespace-nowrap">
                    {m.dueDate ? (
                      <span className={m.isOverdue ? "text-red-400 font-semibold" : ""}>
                        {new Date(m.dueDate).toLocaleDateString("tr-TR")}
                        {m.isOverdue && " ⚠"}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="p-4 text-right font-mono text-red-400">
                    {m.debit > 0 ? `₺${m.debit.toFixed(2)}` : "—"}
                  </td>
                  <td className="p-4 text-right font-mono text-emerald-400">
                    {m.credit > 0 ? `₺${m.credit.toFixed(2)}` : "—"}
                  </td>
                  <td className={`p-4 text-right font-mono font-bold ${m.balance > 0 ? "text-red-400" : "text-emerald-400"}`}>
                    ₺{m.balance.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-800/80">
              <tr>
                <td colSpan={6} className="p-4 text-right font-semibold text-slate-300">Güncel Bakiye</td>
                <td className={`p-4 text-right font-bold text-lg ${customer.currentBalance > 0 ? "text-red-400" : "text-emerald-400"}`}>
                  ₺{customer.currentBalance.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Ahmet senaryosu açıklaması */}
      <div className="mt-6 bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-sm text-slate-400">
        <strong className="text-slate-300">Nasıl çalışır?</strong>
        <ul className="mt-2 space-y-1 list-disc list-inside">
          <li>Kasada <strong>veresiye satış</strong> yapılınca borç (+) satırı eklenir</li>
          <li><strong>Tahsilat</strong> alınınca alacak (-) satırı eklenir</li>
          <li><strong>Bakiye</strong> sütunu her işlem sonrası kalan borcu gösterir</li>
        </ul>
      </div>
    </AdminLayout>
  );
}
