import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: ["@agentxjs/runtime"], // Don't pre-bundle server-only package
  },
  root: ".",
  publicDir: "public",
  build: {
    outDir: "dist/public",
    emptyDirOnly: true,
    sourcemap: true,
    commonjsOptions: {
      exclude: ["@agentxjs/runtime"], // Exclude server package from CJS transform
    },
    rollupOptions: {
      external: [
        // Mark server-only imports as external (they won't be bundled)
        /^db0\/connectors\//,
        /^bun:/,
        /^node:/,
      ],
    },
  },
  server: {
    port: 5173,
    headers: {
      "Cache-Control": "no-store",
    },
    proxy: {
      "/agentx": {
        target: "http://localhost:5200",
        changeOrigin: true,
      },
      "/api": {
        target: "http://localhost:5200",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://localhost:5200",
        ws: true,
      },
    },
  },
});
