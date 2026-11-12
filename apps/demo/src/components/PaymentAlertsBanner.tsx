import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Clock, X, Eye } from "lucide-react";
import { api } from "../lib/api";
import { formatMoney } from "../lib/format";
import { dismissAlerts, isAlertsDismissed, clearAlertsDismiss } from "../lib/posSettings";

interface AlertCustomer {
  customerId: string;
  name: string;
  balance: number | string;
  dueDate: string;
  daysOverdue?: number;
  daysLeft?: number;
  note?: string;
}

interface Alerts {
  overdueCount: number;
  upcomingCount: number;
  overdue: AlertCustomer[];
  upcoming: AlertCustomer[];
}

export default function PaymentAlertsBanner({ compact = false }: { compact?: boolean }) {
  const [alerts, setAlerts] = useState<Alerts | null>(null);
  const [hidden, setHidden] = useState({ overdue: false, upcoming: false });

  useEffect(() => {
    setHidden({
      overdue: isAlertsDismissed("overdue") || isAlertsDismissed("all"),
      upcoming: isAlertsDismissed("upcoming") || isAlertsDismissed("all"),
    });
    api<Alerts>("/customers/alerts").then(setAlerts).catch(() => {});
  }, []);

  if (!alerts) return null;

  const showOverdue = alerts.overdueCount > 0 && !hidden.overdue;
  const showUpcoming = alerts.upcomingCount > 0 && !hidden.upcoming;
  if (!showOverdue && !showUpcoming) return null;

  function hide(type: "overdue" | "upcoming" | "all", hours = 24) {
    dismissAlerts(hours, type);
    if (type === "all") setHidden({ overdue: true, upcoming: true });
    else setHidden((h) => ({ ...h, [type]: true }));
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        {showOverdue && (
          <span className="flex items-center gap-1 text-xs bg-red-900/50 text-red-300 px-2 py-0.5 rounded-full">
            <AlertTriangle size={11} /> {alerts.overdueCount}
            <button type="button" onClick={() => hide("overdue", 8)} className="ml-1 hover:text-white"><X size={11} /></button>
          </span>
        )}
        {showUpcoming && (
          <span className="flex items-center gap-1 text-xs bg-amber-900/50 text-amber-300 px-2 py-0.5 rounded-full">
            <Clock size={11} /> {alerts.upcomingCount}
            <button type="button" onClick={() => hide("upcoming", 8)} className="ml-1 hover:text-white"><X size={11} /></button>
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showOverdue && (
        <div className="bg-red-950/40 border border-red-700 rounded-lg p-3 relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-red-400 font-semibold text-sm flex items-center gap-1.5">
              <AlertTriangle size={16} /> Vadesi geçmiş — {alerts.overdueCount}
            </span>
            <div className="flex gap-1">
              <button type="button" onClick={() => hide("overdue", 24)} title="24 saat gizle" className="text-red-400 hover:text-red-200 p-1"><X size={14} /></button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {alerts.overdue.map((c) => (
              <Link key={c.customerId} to={`/customers/${c.customerId}/ledger`} className="text-xs bg-red-900/50 text-red-200 px-2 py-1 rounded hover:bg-red-900/70">
                {c.name} ₺{formatMoney(c.balance, 0)} ({c.daysOverdue}g)
              </Link>
            ))}
          </div>
        </div>
      )}
      {showUpcoming && (
        <div className="bg-amber-950/30 border border-amber-700/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-amber-400 font-semibold text-sm flex items-center gap-1.5">
              <Clock size={16} /> Yaklaşan — {alerts.upcomingCount}
            </span>
            <button type="button" onClick={() => hide("upcoming", 24)} className="text-amber-400 hover:text-amber-200 p-1"><X size={14} /></button>
          </div>
          <div className="flex flex-wrap gap-2">
            {alerts.upcoming.map((c) => (
              <Link key={c.customerId} to={`/customers/${c.customerId}/ledger`} className="text-xs bg-amber-900/40 text-amber-200 px-2 py-1 rounded">
                {c.name} — {c.daysLeft === 0 ? "bugün" : `${c.daysLeft}g`}
              </Link>
            ))}
          </div>
        </div>
      )}
      {(hidden.overdue || hidden.upcoming) && (
        <button type="button" onClick={() => { clearAlertsDismiss(); setHidden({ overdue: false, upcoming: false }); }} className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">
          <Eye size={12} /> Uyarıları tekrar göster
        </button>
      )}
    </div>
  );
}
