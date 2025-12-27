/**
 * Bun Build Script for @agentxjs/portagent
 * Builds CLI, Server, and Client bundles (ESM-only)
 */

import { cp } from "fs/promises";

const outdir = "./dist";

console.log("🚀 Building @agentxjs/portagent (ESM-only)\n");

// Build server and CLI
console.log("📦 Building server/index...");
const serverResult = await Bun.build({
  entrypoints: ["src/server/index.ts"],
  outdir,
  format: "esm",
  target: "node",
  sourcemap: "external",
  minify: false,
  naming: {
    entry: "server/index.js",
  },
  external: [
    "agentxjs",
    "@agentxjs/*",
    "hono",
    "@hono/node-server",
    "pino",
    "pino-pretty",
    "jose",
    "commander",
    "dotenv",
  ],
});

console.log("📦 Building cli/index...");
const cliResult = await Bun.build({
  entrypoints: ["src/cli/index.ts"],
  outdir,
  format: "esm",
  target: "node",
  sourcemap: "external",
  minify: false,
  naming: {
    entry: "cli/index.js",
  },
  external: [
    "agentxjs",
    "@agentxjs/*",
    "hono",
    "@hono/node-server",
    "pino",
    "pino-pretty",
    "jose",
    "commander",
    "dotenv",
  ],
});

console.log("📦 Building client...");
const clientResult = await Bun.build({
  entrypoints: ["src/client/main.tsx"],
  outdir: `${outdir}/public`,
  format: "esm",
  target: "browser",
  sourcemap: "external",
  minify: false,
  naming: {
    entry: "assets/[name]-[hash].js",
    chunk: "assets/[name]-[hash].js",
    asset: "assets/[name]-[hash][ext]",
  },
  external: [
    // Server-only packages won't be imported in browser code anyway
    "@agentxjs/runtime",
  ],
});

// Copy public assets
console.log("📦 Copying public assets...");
try {
  await cp("public", `${outdir}/public`, { recursive: true, force: false });
} catch (e) {
  // public folder might not exist or already copied
}

// Generate index.html
console.log("📦 Generating index.html...");
const entryFile = clientResult.outputs.find((o) => o.path.includes("main"));
if (entryFile) {
  const scriptPath = entryFile.path.replace(`${outdir}/public/`, "/");
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Portagent - AgentX Portal</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="${scriptPath}"></script>
  </body>
</html>`;
  await Bun.write(`${outdir}/public/index.html`, html);
}

// Check results
let hasErrors = false;
const results = [serverResult, cliResult, clientResult];
for (const result of results) {
  if (!result.success) {
    console.error("❌ Build failed:");
    for (const log of result.logs) console.error(log);
    hasErrors = true;
  }
}

if (hasErrors) {
  process.exit(1);
}

console.log(`✅ Server: ${serverResult.outputs.length} files`);
console.log(`✅ CLI: ${cliResult.outputs.length} files`);
console.log(`✅ Client: ${clientResult.outputs.length} files`);
console.log(`🎉 Build complete!`);
