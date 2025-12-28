import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: ".",
  build: {
    outDir: "dist/public",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5200",
        changeOrigin: true,
      },
      "/agentx": {
        target: "http://localhost:5200",
        changeOrigin: true,
      },
      "/ws": {
        target: "http://localhost:5200",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
