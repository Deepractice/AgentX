import { defineConfig } from "tsup";
import path from "path";

export default defineConfig({
  entry: {
    index: "src/index.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  target: "es2020",
  noExternal: ["@agentxjs/agent", "@agentxjs/engine"],
  esbuildOptions(options) {
    options.alias = {
      "~": path.resolve(__dirname, "./src"),
    };
  },
});
