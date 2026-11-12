import { Beaker, RotateCcw } from "lucide-react";
import { resetDemoState } from "../lib/demoStore";

export default function DemoBanner() {
  return (
    <div className="bg-amber-500 text-slate-950 px-3 py-1.5 text-xs sm:text-sm flex items-center justify-center gap-2 font-medium z-50">
      <Beaker size={14} className="shrink-0" />
      <span>
        CANLI DEMO — örnek veri · gerçek ödeme / SMS / e-posta yok ·{" "}
        <span className="hidden sm:inline">admin@aurabarkod.com / admin123</span>
      </span>
      <button
        type="button"
        className="ml-2 inline-flex items-center gap-1 underline underline-offset-2 hover:no-underline"
        onClick={() => {
          resetDemoState();
          window.location.href = "/login";
        }}
        title="Örnek veriyi sıfırla"
      >
        <RotateCcw size={12} /> Sıfırla
      </button>
    </div>
  );
}
