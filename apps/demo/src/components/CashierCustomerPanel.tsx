import { useEffect, useState } from "react";
import { X, Search, User, Banknote } from "lucide-react";
import { api } from "../lib/api";
import { formatMoney, toNum } from "../lib/format";

interface Customer {
  id: string;
  name: string;
  phone?: string;
  account?: { balance: number | string; creditLimit: number | string };
}

export default function CashierCustomerPanel({
  open,
  onClose,
  selectedId,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  selectedId?: string;
  onSelect: (id?: string, name?: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [debtOnly, setDebtOnly] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payModal, setPayModal] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    const params = new URLSearchParams({ search });
    if (debtOnly) params.set("debtOnly", "1");
    api<Customer[]>(`/customers?${params}`).then(setCustomers).catch(() => {});
  }, [open, search, debtOnly]);

  async function collectPayment() {
    if (!payModal || !payAmount) return;
    try {
      await api(`/customers/${payModal.id}/payment`, {
        method: "POST",
        body: JSON.stringify({ amount: parseFloat(payAmount), note: "Kasa tahsilat" }),
      });
      setMessage(`₺${payAmount} tahsil edildi`);
      setPayModal(null);
      setPayAmount("");
      api<Customer[]>(`/customers?${new URLSearchParams({ search, ...(debtOnly ? { debtOnly: "1" } : {}) })}`).then(setCustomers).catch(() => {});
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Hata");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-slate-900 border-l border-slate-700 flex flex-col h-full shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h2 className="font-bold text-teal-400 flex items-center gap-2"><User size={18} /> Müşteri</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-4 border-b border-slate-800">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="İsim veya telefon ara..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2.5 text-sm"
            />
          </div>
          <button type="button" onClick={() => { onSelect(undefined, undefined); }} className={`mt-2 w-full text-left px-3 py-2 rounded-lg text-sm ${!selectedId ? "bg-teal-900/50 text-teal-300" : "text-slate-400 hover:bg-slate-800"}`}>
            Misafir müşteri
          </button>
          <button
            type="button"
            onClick={() => setDebtOnly((v) => !v)}
            className={`mt-2 w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${debtOnly ? "bg-amber-900/40 text-amber-300" : "text-slate-400 hover:bg-slate-800"}`}
          >
            <Banknote size={14} /> Sadece borçlular
          </button>
        </div>

        {message && <div className="mx-4 mt-3 text-sm text-emerald-400 bg-emerald-900/20 rounded-lg px-3 py-2">{message}</div>}

        <div className="flex-1 overflow-auto p-2">
          {customers.map((c) => (
            <div key={c.id} className={`rounded-lg p-3 mb-1 ${selectedId === c.id ? "bg-teal-900/30 border border-teal-700" : "hover:bg-slate-800"}`}>
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => { onSelect(c.id, c.name); onClose(); }} className="text-left flex-1">
                  <div className="font-medium">{c.name}</div>
                  {c.phone && <div className="text-xs text-slate-500">{c.phone}</div>}
                  {c.account && toNum(c.account.balance) > 0 && (
                    <div className="text-xs text-amber-400 mt-0.5">Borç: ₺{formatMoney(c.account.balance)}</div>
                  )}
                </button>
                {c.account && toNum(c.account.balance) > 0 && (
                  <button type="button" onClick={() => setPayModal(c)} className="p-2 text-emerald-400 hover:bg-slate-700 rounded-lg" title="Tahsilat">
                    <Banknote size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {payModal && (
          <div className="p-4 border-t border-slate-800 bg-slate-950">
            <div className="text-sm text-slate-400 mb-2">{payModal.name} — Borç: ₺{formatMoney(payModal.account?.balance)}</div>
            <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="Tahsilat tutarı" className="w-full bg-slate-800 rounded-lg px-3 py-2 mb-2" />
            <div className="flex gap-2">
              <button type="button" onClick={collectPayment} className="flex-1 bg-emerald-600 py-2 rounded-lg font-semibold text-sm">Tahsil Et</button>
              <button type="button" onClick={() => setPayModal(null)} className="px-4 text-slate-400 text-sm">İptal</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
