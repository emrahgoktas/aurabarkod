import { offlineDb } from "./offline";

export async function getPendingOfflineCount(): Promise<number> {
  return offlineDb.sales.filter((s) => !s.synced).count();
}

export async function syncOfflineSales(): Promise<{ synced: number; pending: number }> {
  const pending = await offlineDb.sales.filter((s) => !s.synced).toArray();
  let synced = 0;
  for (const sale of pending) {
    try {
      await import("./api").then((m) => m.api("/sales", { method: "POST", body: JSON.stringify(sale) }));
      if (sale.id != null) {
        await offlineDb.sales.update(sale.id, { synced: true });
      }
      synced++;
    } catch {
      break;
    }
  }
  const remaining = await getPendingOfflineCount();
  return { synced, pending: remaining };
}
