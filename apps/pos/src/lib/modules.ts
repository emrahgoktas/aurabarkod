import type { PackageType } from "@aura/shared";

export const MODULES = {
  COMMON: ["offline_sync", "backup", "csv_import", "efatura", "receipt_print", "multi_branch", "qr_payment", "accounting_export", "dashboard", "customers", "products", "returns", "z_report"],
  MARKET: ["scale_barcode", "credit_account", "supplier_invoice", "shortcuts", "weighted_products", "low_stock"],
  RETAIL: ["variants", "campaigns", "loyalty", "label_print", "size_color"],
} as const;

export type ModuleId =
  | (typeof MODULES.MARKET)[number]
  | (typeof MODULES.RETAIL)[number]
  | (typeof MODULES.COMMON)[number];

export function hasModule(packageType: PackageType, module: ModuleId): boolean {
  const common = MODULES.COMMON as readonly string[];
  if (common.includes(module)) return true;
  return (MODULES[packageType] as readonly string[]).includes(module);
}

import { useAuth } from "../stores/pos";

export function usePackageType(): PackageType {
  const pkg = useAuth((s) => s.user?.organization?.packageType);
  return pkg === "RETAIL" ? "RETAIL" : "MARKET";
}

export function useModules() {
  const packageType = usePackageType();
  return {
    packageType,
    isMarket: packageType === "MARKET",
    isRetail: packageType === "RETAIL",
    has: (module: ModuleId) => hasModule(packageType, module),
  };
}
