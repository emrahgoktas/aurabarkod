import { useState } from "react";
import { Store } from "lucide-react";

type Branch = {
  id: string;
  name: string;
  registers: Array<{ id: string; name: string; code: string }>;
};

export default function BranchRegisterPicker({
  branches,
  initialBranchId,
  initialRegisterId,
  onConfirm,
  onCancel,
}: {
  branches: Branch[];
  initialBranchId?: string | null;
  initialRegisterId?: string | null;
  onConfirm: (branchId: string, registerId: string) => void;
  onCancel?: () => void;
}) {
  const [branchId, setBranchId] = useState(initialBranchId || branches[0]?.id || "");
  const selectedBranch = branches.find((b) => b.id === branchId);
  const registers = selectedBranch?.registers || [];
  const [registerId, setRegisterId] = useState(
    initialRegisterId && registers.some((r) => r.id === initialRegisterId)
      ? initialRegisterId
      : registers[0]?.id || ""
  );

  function handleBranchChange(id: string) {
    setBranchId(id);
    const b = branches.find((x) => x.id === id);
    setRegisterId(b?.registers[0]?.id || "");
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-2 text-teal-400 mb-4">
          <Store size={20} />
          <h2 className="font-bold text-lg text-white">Şube ve Kasa Seçin</h2>
        </div>
        <p className="text-sm text-slate-400 mb-4">Satışlar seçtiğiniz kasa üzerinden kaydedilir.</p>

        <label className="block mb-4">
          <span className="text-sm text-slate-400">Şube</span>
          <select
            value={branchId}
            onChange={(e) => handleBranchChange(e.target.value)}
            className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </label>

        <label className="block mb-6">
          <span className="text-sm text-slate-400">Kasa</span>
          <select
            value={registerId}
            onChange={(e) => setRegisterId(e.target.value)}
            className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3"
            disabled={registers.length === 0}
          >
            {registers.map((r) => (
              <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
            ))}
          </select>
        </label>

        <div className="flex gap-3">
          {onCancel && (
            <button type="button" onClick={onCancel} className="flex-1 border border-slate-600 rounded-lg py-2.5 text-slate-400">
              İptal
            </button>
          )}
          <button
            type="button"
            disabled={!branchId || !registerId}
            onClick={() => onConfirm(branchId, registerId)}
            className="flex-1 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 rounded-lg py-2.5 font-semibold"
          >
            Devam Et
          </button>
        </div>
      </div>
    </div>
  );
}
