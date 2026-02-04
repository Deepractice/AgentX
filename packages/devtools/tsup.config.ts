import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "mock/index": "src/mock/index.ts",
    "recorder/index": "src/recorder/index.ts",
    "fixtures/index": "fixtures/index.ts",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["@agentxjs/core", "@agentxjs/claude-driver", "commonxjs"],
});
