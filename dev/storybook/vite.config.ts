import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Vite config for Storybook development
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "../../packages/ui/src"),
    },
  },
  css: {
    postcss: "./postcss.config.js",
  },
  optimizeDeps: {
    exclude: ["@agentxjs/runtime", "db0", "unstorage", "pg", "mongodb", "mysql2"],
  },
});
