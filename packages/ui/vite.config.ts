import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ["src"],
      exclude: ["src/**/*.stories.tsx", "src/**/*.test.tsx"],
    }),
  ],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "AgentXUI",
      formats: ["es"],
      fileName: (format) => `index.${format === "es" ? "js" : "cjs"}`,
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        // Server-only packages (prevent bundling)
        "@agentxjs/runtime",
        /^db0\//,
        /^unstorage\//,
        /^bun:/,
        /^node:/,
        "pg",
        "mongodb",
        "mysql2",
      ],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
        assetFileNames: (assetInfo) => {
          // All CSS files should be output as globals.css
          if (assetInfo.name?.endsWith(".css")) {
            return "globals.css";
          }
          return "assets/[name]-[hash][extname]";
        },
      },
    },
    sourcemap: true,
    minify: false, // Keep readable for debugging
  },
});
