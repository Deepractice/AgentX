/**
 * Bun Build Script for agentxjs
 * Builds both Node.js and Browser entry points
 */

import { dts } from "bun-dts";

const outdir = "./dist";

await Bun.$`rm -rf ${outdir}`;

console.log("🚀 Building agentxjs (Node.js + Browser)\n");

// Build Node.js entry (includes runtime)
console.log("📦 Building Node.js entry (index.js)...");
const nodeResult = await Bun.build({
  entrypoints: ["src/index.ts"],
  outdir,
  format: "esm",
  target: "node",
  sourcemap: "external",
  minify: false,
  external: ["@agentxjs/*", "reconnecting-websocket", "ws"],
  plugins: [dts()],
});

if (!nodeResult.success) {
  console.error("❌ Node build failed:");
  for (const log of nodeResult.logs) console.error(log);
  process.exit(1);
}

// Build Browser entry (remote mode only, no runtime)
console.log("📦 Building Browser entry (browser.js)...");
const browserResult = await Bun.build({
  entrypoints: ["src/browser.ts"],
  outdir,
  format: "esm",
  target: "browser",
  sourcemap: "external",
  minify: false,
  external: ["@agentxjs/*", "reconnecting-websocket"],
  naming: {
    entry: "[name].js",
  },
});

if (!browserResult.success) {
  console.error("❌ Browser build failed:");
  for (const log of browserResult.logs) console.error(log);
  process.exit(1);
}

console.log(`✅ Node.js build: ${nodeResult.outputs.length} files`);
console.log(`✅ Browser build: ${browserResult.outputs.length} files`);
console.log(`🎉 Build complete!`);
