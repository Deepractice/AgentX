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

// Copy globals.css to dist
console.log("📦 Copying globals.css...");
await cp("src/styles/globals.css", `${outdir}/globals.css`);

// Generate precompiled CSS with Tailwind CLI (for zero-config mode)
console.log("📦 Generating precompiled CSS (agentx-ui.css)...");
try {
  // Try workspace root node_modules first, then local
  const tailwindBin = "../../node_modules/.bin/tailwindcss";
  const tailwindResult =
    await Bun.$`${tailwindBin} -i src/styles/globals.css -o ${outdir}/agentx-ui.css --minify`.quiet();

  if (tailwindResult.exitCode !== 0) {
    console.warn("⚠️  Tailwind CSS generation failed, skipping precompiled CSS");
  } else {
    console.log("✅ Precompiled CSS generated");
  }
} catch (error) {
  console.warn("⚠️  Tailwind CSS not available, skipping precompiled CSS");
}

console.log(`✅ ESM build: ${result.outputs.length} files`);
console.log(`✅ CSS copied`);
console.log(`🎉 Build complete!`);
