import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    "@agentxjs/core",
    "@agentxjs/node-provider",
    "@agentxjs/claude-driver",
    "commonxjs",
  ],
});
