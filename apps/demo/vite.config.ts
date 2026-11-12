import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@aura/shared": fileURLToPath(new URL("./src/lib/shared.ts", import.meta.url)),
    },
  },
  server: { port: 5174 },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
