import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "persistence/index": "src/persistence/index.ts",
    "mq/index": "src/mq/index.ts",
    "network/index": "src/network/index.ts",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["@agentxjs/core", "commonxjs", "rxjs", "unstorage", "ws"],
});
