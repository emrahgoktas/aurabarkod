import Dexie, { Table } from "dexie";
import type { CartItem, SalePayload } from "./shared";

export interface OfflineSale extends SalePayload {
  id?: number;
  createdAt: string;
  synced: boolean;
}

export interface CachedProduct {
  id: string;
  name: string;
  barcode?: string;
  price: number;
  stock: number;
  taxRate: number;
  unit: string;
  isWeighted?: boolean;
  hasVariants?: boolean;
  imageUrl?: string;
  variants?: Array<{ id: string; barcode?: string; size?: string; color?: string; price?: number; stock: number }>;
}

class AuraOfflineDB extends Dexie {
  sales!: Table<OfflineSale, number>;
  products!: Table<CachedProduct, string>;
  syncQueue!: Table<{ id?: number; type: string; payload: unknown; createdAt: string }, number>;

  constructor() {
    super("AuraBarkodOffline");
    this.version(1).stores({
      sales: "++id, offlineId, synced, createdAt",
      products: "id, barcode, name",
      syncQueue: "++id, type, createdAt",
    });
  }
}

export const offlineDb = new AuraOfflineDB();
