/**
 * Bun Build Script for @agentxjs/types
 *
 * ESM-only modern build (2025 best practice)
 * Outputs: .js (ESM) + .d.ts files
 */

import { dts } from "bun-dts";

const entrypoints = [
  "src/index.ts",
  "src/agent/index.ts",
  "src/agent/internal/index.ts",
  "src/runtime/index.ts",
  "src/runtime/internal/index.ts",
  "src/event/index.ts",
  "src/common/index.ts",
  "src/agentx/index.ts",
  "src/network/index.ts",
];

const outdir = "./dist";

// Clean
await Bun.$`rm -rf ${outdir}`;

console.log("🚀 Building @agentxjs/types (ESM-only)\n");

// Build ESM + DTS in one go
const result = await Bun.build({
  entrypoints,
  outdir,
  format: "esm",
  target: "browser",
  sourcemap: "external",
  minify: false,
  plugins: [dts()],
});

if (!result.success) {
  console.error("❌ Build failed:");
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

console.log(`✅ ESM build: ${result.outputs.length} files`);
console.log(`✅ DTS generated`);
console.log(`\n🎉 Build complete! Output: ${outdir}`);
