/**
 * Bun Build Script for @agentxjs/ui
 * ESM-only React component library build
 */

import { dts } from "bun-dts";
import { cp } from "fs/promises";

const entrypoints = ["src/index.ts"];
const outdir = "./dist";

await Bun.$`rm -rf ${outdir}`;

console.log("🚀 Building @agentxjs/ui (ESM-only)\n");

const result = await Bun.build({
  entrypoints,
  outdir,
  format: "esm",
  target: "browser",
  sourcemap: "external",
  minify: false,
  external: [
    "react",
    "react-dom",
    "react/jsx-runtime",
    "@agentxjs/*",
    "agentxjs",
    // UI dependencies
    "framer-motion",
    "lucide-react",
    "clsx",
    "tailwind-merge",
    "class-variance-authority",
    "zustand",
    "mitt",
    "react-markdown",
    "remark-gfm",
    "allotment",
    "vaul",
    "@emoji-mart/data",
    "@emoji-mart/react",
  ],
  plugins: [dts()],
});

if (!result.success) {
  console.error("❌ Build failed:");
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

// Copy CSS file to dist
console.log("📦 Copying CSS...");
await cp("src/styles/globals.css", `${outdir}/globals.css`);

console.log(`✅ ESM build: ${result.outputs.length} files`);
console.log(`✅ CSS copied`);
console.log(`🎉 Build complete!`);
