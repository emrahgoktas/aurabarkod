import { AlertTriangle, Clock } from "lucide-react";
import { useAuth } from "../stores/pos";

export default function TrialBanner() {
  const tenant = useAuth((s) => s.tenant);
  if (!tenant || tenant.status !== "TRIAL") return null;

  const isLow = tenant.trialDaysLeft <= 3;

  return (
    <div className={`px-4 py-2 text-sm flex items-center justify-center gap-2 ${isLow ? "bg-amber-900/50 text-amber-200 border-b border-amber-800" : "bg-teal-900/30 text-teal-300 border-b border-teal-800"}`}>
      {isLow ? <AlertTriangle size={14} /> : <Clock size={14} />}
      <span>
        Deneme sürümü — <strong>{tenant.trialDaysLeft} gün</strong> kaldı
        {tenant.usage && tenant.limits && (
          <> · {tenant.usage.users}/{tenant.limits.maxTrialUsers} kullanıcı · {tenant.usage.products}/{tenant.limits.maxTrialProducts} ürün</>
        )}
      </span>
    </div>
  );
}
