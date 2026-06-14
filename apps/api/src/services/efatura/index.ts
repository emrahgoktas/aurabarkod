import { mockProvider } from "./mock";
import { createGibProvider } from "./gib";
import type { EInvoiceProvider } from "./types";

export function getEInvoiceProvider(name?: string): EInvoiceProvider {
  const provider = (name || process.env.EFATURA_PROVIDER || "mock").toLowerCase();
  if (provider === "gib" || provider === "gib-sandbox") return createGibProvider();
  return mockProvider;
}

export * from "./types";
