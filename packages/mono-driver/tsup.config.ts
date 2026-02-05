import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["@agentxjs/core", "ai", "@ai-sdk/anthropic", "@ai-sdk/openai", "@ai-sdk/google"],
});
