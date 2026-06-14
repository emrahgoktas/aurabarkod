const API = "/api";

export function getTenantSlug(): string | null {
  return localStorage.getItem("aura_tenant_slug");
}

export function setTenantSlug(slug: string | null) {
  if (slug) localStorage.setItem("aura_tenant_slug", slug);
  else localStorage.removeItem("aura_tenant_slug");
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("aura_token");
  const tenantSlug = getTenantSlug();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (tenantSlug) headers["X-Tenant-Slug"] = tenantSlug;

  const res = await fetch(`${API}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "API hatası");
  }
  return res.json();
}

export function isOnline(): boolean {
  return navigator.onLine;
}

export { syncOfflineSales, getPendingOfflineCount } from "./offlineSync";
