/**
 * Build script for @agentxjs/queue
 */

import { dts } from "bun-dts";

await Bun.$`rm -rf dist`;

console.log("Building @agentxjs/queue...\n");

const result = await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  format: "esm",
  target: "node",
  sourcemap: "external",
  minify: false,
  external: ["@agentxjs/*", "db0", "db0/*"],
  plugins: [dts()],
});

if (!result.success) {
  console.error("Build failed:");
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

console.log(`✅ Build: ${result.outputs.length} files`);
console.log("🎉 Build complete!");
