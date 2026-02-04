import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["@agentxjs/core", "@anthropic-ai/claude-agent-sdk", "rxjs"],
});
