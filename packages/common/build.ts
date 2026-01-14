/**
 * Bun Build Script for @agentxjs/common
 * ESM-only modern build
 *
 * - Main entry (logger): browser compatible
 * - SQLite entry: node/bun only
 */

import { dts } from "bun-dts";

const outdir = "./dist";

await Bun.$`rm -rf ${outdir}`;

console.log("🚀 Building @agentxjs/common (ESM-only)\n");

// Build main entry (browser compatible)
const mainResult = await Bun.build({
  entrypoints: ["src/index.ts"],
  outdir,
  format: "esm",
  target: "browser",
  sourcemap: "external",
  minify: false,
  external: ["./sqlite", "./sqlite/index"],
  plugins: [dts()],
});

if (!mainResult.success) {
  console.error("❌ Main build failed:");
  for (const log of mainResult.logs) console.error(log);
  process.exit(1);
}

console.log(`✅ Main build: ${mainResult.outputs.length} files`);

// Build SQLite entry (node/bun only)
const sqliteResult = await Bun.build({
  entrypoints: ["src/sqlite/index.ts"],
  outdir: `${outdir}/sqlite`,
  format: "esm",
  target: "node",
  sourcemap: "external",
  minify: false,
  external: ["bun:sqlite", "node:sqlite"],
  plugins: [dts()],
});

if (!sqliteResult.success) {
  console.error("❌ SQLite build failed:");
  for (const log of sqliteResult.logs) console.error(log);
  process.exit(1);
}

console.log(`✅ SQLite build: ${sqliteResult.outputs.length} files`);

// Build Path entry (node/bun only)
const pathResult = await Bun.build({
  entrypoints: ["src/path/index.ts"],
  outdir: `${outdir}/path`,
  format: "esm",
  target: "node",
  sourcemap: "external",
  minify: false,
  external: ["node:path", "node:url", "node:fs"],
  plugins: [dts()],
});

if (!pathResult.success) {
  console.error("❌ Path build failed:");
  for (const log of pathResult.logs) console.error(log);
  process.exit(1);
}

console.log(`✅ Path build: ${pathResult.outputs.length} files`);
console.log(`🎉 Build complete!`);
