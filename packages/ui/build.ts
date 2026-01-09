/**
 * Bun Build Script for @agentxjs/ui
 * ESM-only React component library build
 */

import { generateDts, logIsolatedDeclarationErrors } from "bun-dts";
import { cp } from "fs/promises";

const entrypoints = ["src/index.ts"];
const outdir = "./dist";

await Bun.$`rm -rf ${outdir}`;

console.log("🚀 Building @agentxjs/ui (ESM-only)\n");

// Generate declarations first with error checking
const dtsResult = await generateDts(entrypoints);

// Files with cva() exports - these can't have explicit types due to VariantProps compatibility
const cvaExportFiles = [
  // shadcn ui components
  "ui/button.tsx",
  "ui/badge.tsx",
  // element components
  "element/TabNavigation.tsx",
];

// Filter: allow TS9010 (missing type annotation) for known cva files
const isCvaRelatedError = (e: (typeof dtsResult.errors)[0]): boolean => {
  const isCvaFile = cvaExportFiles.some((f) => e.file.endsWith(f));
  const isTS9010 = e.error.message?.includes("TS9010");
  return isCvaFile && isTS9010;
};

const actualErrors = dtsResult.errors.filter((e) => !isCvaRelatedError(e));
const cvaWarnings = dtsResult.errors.filter((e) => isCvaRelatedError(e));

// Log cva warnings but don't fail
if (cvaWarnings.length > 0) {
  console.warn("⚠️  cva type warnings (non-blocking - VariantProps compatibility):");
  for (const w of cvaWarnings) {
    console.warn(`   ${w.file.split("/").pop()}: ${w.error.message?.split(":")[0]}`);
  }
}

// Fail on actual errors
if (actualErrors.length > 0) {
  console.error("❌ Declaration generation failed:");
  logIsolatedDeclarationErrors(actualErrors);
  process.exit(1);
}

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
});

if (!result.success) {
  console.error("❌ Build failed:");
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

// Write declaration files
for (const file of dtsResult.files) {
  await Bun.write(`${outdir}/${file.outputPath}`, file.dts);
}
console.log("✅ DTS generated");

// Copy globals.css to dist
console.log("📦 Copying globals.css...");
await cp("src/styles/globals.css", `${outdir}/globals.css`);

// Generate precompiled CSS with Tailwind 3.x CLI (for zero-config mode)
console.log("📦 Generating precompiled CSS (agentx-ui.css)...");
try {
  const tailwindBin = "../../node_modules/.bin/tailwindcss";
  const tailwindResult =
    await Bun.$`${tailwindBin} --config ./tailwind.config.js --input ./styles-temp.css --output ${outdir}/agentx-ui.css --minify`.quiet();

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
