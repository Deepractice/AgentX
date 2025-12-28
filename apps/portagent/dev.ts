/**
 * Bun Development Build Script
 * Watches client files and rebuilds on changes
 */

import { watch } from "fs";
import { cp } from "fs/promises";

const outdir = "./dist";

async function buildClient() {
  console.log("🔨 Building client...");
  const start = Date.now();

  const result = await Bun.build({
    entrypoints: ["src/client/main.tsx"],
    outdir: `${outdir}/public`,
    format: "esm",
    target: "browser",
    sourcemap: "external",
    minify: false,
    naming: {
      entry: "assets/[name]-[hash].js",
      chunk: "assets/[name]-[hash].js",
      asset: "assets/[name]-[hash].[ext]", // Keep .css extension
    },
    external: ["@agentxjs/runtime"],
  });

  if (!result.success) {
    console.error("❌ Build failed:");
    for (const log of result.logs) console.error(log);
    return;
  }

  // Copy public assets
  try {
    await cp("public", `${outdir}/public`, { recursive: true, force: false });
  } catch {
    // Ignore if already exists
  }

  // Generate CSS with PostCSS + Tailwind 4.x
  try {
    await Bun.$`bunx postcss src/client/input.css -o ${outdir}/public/assets/styles.css`.quiet();
  } catch (e) {
    console.warn("⚠️  CSS generation failed:", e);
  }

  // Generate index.html
  const entryFile = result.outputs.find((o) => o.path.includes("main") && o.path.endsWith(".js"));

  if (entryFile) {
    // Extract just the filename from the full path
    const jsFilename = entryFile.path.split("/").pop();
    const scriptPath = `/assets/${jsFilename}`;

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Portagent - AgentX Portal</title>
    <link rel="stylesheet" href="/assets/styles.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="${scriptPath}"></script>
  </body>
</html>`;
    await Bun.write(`${outdir}/public/index.html`, html);
  }

  const duration = Date.now() - start;
  console.log(`✅ Client built in ${duration}ms (${result.outputs.length} files)`);
}

// Initial build
await buildClient();

// Watch for changes
console.log("👀 Watching src/client for changes...\n");

const watcher = watch("./src/client", { recursive: true }, async (event, filename) => {
  if (
    filename &&
    (filename.endsWith(".tsx") || filename.endsWith(".ts") || filename.endsWith(".css"))
  ) {
    console.log(`📝 ${event}: ${filename}`);
    await buildClient();
  }
});

// Keep process alive
process.on("SIGINT", () => {
  console.log("\n👋 Stopping dev build...");
  watcher.close();
  process.exit(0);
});
