import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: {
    resolve: true,
  },
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  minify: false,
  target: "es2022",
  outDir: "dist",
  external: [
    "@deepractice-ai/agentx-api",
    "@deepractice-ai/agentx-core",
    "@deepractice-ai/agentx-types",
  ],
  tsconfig: "./tsconfig.json",
  esbuildOptions(options) {
    options.alias = {
      "~": "./src",
    };
  },
});
