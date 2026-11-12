import { mockApi } from "./mockApi";

export function getTenantSlug(): string | null {
  return localStorage.getItem("aura_tenant_slug");
}

export function setTenantSlug(slug: string | null) {
  if (slug) localStorage.setItem("aura_tenant_slug", slug);
  else localStorage.removeItem("aura_tenant_slug");
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  return mockApi<T>(path, options);
}

export function isOnline(): boolean {
  return navigator.onLine;
}

export { syncOfflineSales, getPendingOfflineCount } from "./offlineSync";

/** /api/* fetch çağrılarını mock API'ye yönlendir (Login/Settings ham fetch) */
export function installDemoFetchPatch() {
  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.includes("/api/")) {
      const path = url.split("/api")[1] || "/";
      try {
        const data = await mockApi(path, init);
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Hata" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
    return original(input, init);
  };
}
