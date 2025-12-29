/**
 * Bun Build Script for @agentxjs/portagent
 *
 * Builds standalone binaries for all platforms with bundled Claude Code.
 * This is an application (not a library), so we always build binaries for distribution.
 *
 * Usage:
 *   bun run build.ts           # Build binaries for all platforms
 */

import { cp, mkdir, writeFile, rm } from "fs/promises";
import { join } from "path";

const pkg = await Bun.file("./package.json").json();
const VERSION = pkg.version;
const outdir = "./dist";

// Platform targets for binary builds
const BINARY_TARGETS = [
  { platform: "darwin-arm64", target: "bun-darwin-arm64", ext: "" },
  { platform: "darwin-x64", target: "bun-darwin-x64", ext: "" },
  { platform: "linux-x64", target: "bun-linux-x64", ext: "" },
  { platform: "linux-arm64", target: "bun-linux-arm64", ext: "" },
  { platform: "windows-x64", target: "bun-windows-x64", ext: ".exe" },
] as const;

// External packages that shouldn't be bundled in binary (optional drivers)
const BINARY_EXTERNALS = [
  // Database drivers (optional, not used by portagent)
  "mysql2",
  "mysql2/promise",
  "ioredis",
  "mongodb",
  "pg",
  "@planetscale/database",
  "@libsql/client",
  "better-sqlite3",
  // Unstorage optional drivers
  "unstorage/drivers/redis",
  "unstorage/drivers/mongodb",
  "unstorage/drivers/db0",
];

async function buildFrontend() {
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
      asset: "assets/[name]-[hash].[ext]",
    },
    external: ["@agentxjs/runtime"],
  });

  // Copy public assets
  console.log("📦 Copying public assets...");
  try {
    await cp("public", `${outdir}/public`, { recursive: true, force: false });
  } catch {
    // public folder might not exist
  }

  // Generate CSS
  console.log("📦 Generating Tailwind CSS...");
  try {
    await Bun.$`bunx postcss src/client/input.css -o ${outdir}/public/assets/styles.css --env production`.quiet();
    console.log("✅ Tailwind CSS generated");
  } catch (e) {
    console.warn("⚠️  CSS generation failed:", e);
  }

  // Generate index.html
  console.log("📦 Generating index.html...");
  const entryFile = clientResult.outputs.find(
    (o) => o.path.includes("main") && o.path.endsWith(".js")
  );

  if (entryFile) {
    const jsFilename = entryFile.path.split("/").pop();
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
    <script type="module" src="/assets/${jsFilename}"></script>
  </body>
</html>`;
    await Bun.write(`${outdir}/public/index.html`, html);
  }

  console.log(`✅ Client: ${clientResult.outputs.length} files`);
}

async function buildBinaries() {
  console.log(`\n🚀 Building Portagent v${VERSION} binaries (single package)\n`);

  // Clean dist completely
  await rm(outdir, { recursive: true, force: true });
  await mkdir(`${outdir}/bin`, { recursive: true });

  // Build frontend to dist/public
  await buildFrontend();

  // Build binary for each platform
  console.log("\n📦 Building platform binaries...\n");

  for (const { platform, target, ext } of BINARY_TARGETS) {
    console.log(`   🔨 ${platform}...`);

    const binName = `portagent-${platform}${ext}`;
    const binPath = join(outdir, "bin", binName);

    try {
      const externalArgs = BINARY_EXTERNALS.flatMap((pkg) => ["--external", pkg]);

      await Bun.$`bun build --compile \
        --target ${target} \
        --minify \
        --define "IS_COMPILED_BINARY=true" \
        ${externalArgs} \
        ./src/cli/index.ts \
        --outfile ${binPath}`.quiet();

      console.log(`      ✅ Built`);
    } catch (error: any) {
      console.error(`      ❌ Failed:`, error.stderr || error.message);
    }
  }

  // Copy Claude Code to dist/
  console.log("\n📦 Bundling Claude Code...");
  const claudeCodeSrc = "../../node_modules/@anthropic-ai/claude-code";
  const claudeCodeDest = join(outdir, "claude-code");
  try {
    await cp(claudeCodeSrc, claudeCodeDest, { recursive: true });
    console.log(`   ✅ Claude Code bundled (~70MB)`);
  } catch (error: any) {
    console.error(`   ❌ Failed to copy Claude Code:`, error.message);
  }

  // Create CLI wrapper script
  console.log("\n📦 Creating CLI wrapper...");
  await writeFile(
    join(outdir, "cli.js"),
    `#!/usr/bin/env node
const { execFileSync } = require("child_process");
const { join } = require("path");

const BINARIES = {
  "darwin-arm64": "portagent-darwin-arm64",
  "darwin-x64": "portagent-darwin-x64",
  "linux-arm64": "portagent-linux-arm64",
  "linux-x64": "portagent-linux-x64",
  "win32-x64": "portagent-windows-x64.exe",
};

const platformKey = \`\${process.platform}-\${process.arch}\`;
const binName = BINARIES[platformKey];

if (!binName) {
  console.error(\`Unsupported platform: \${platformKey}\`);
  console.error(\`Supported: \${Object.keys(BINARIES).join(", ")}\`);
  process.exit(1);
}

const binPath = join(__dirname, "bin", binName);

try {
  execFileSync(binPath, process.argv.slice(2), { stdio: "inherit" });
} catch (error) {
  if (error.status !== undefined) {
    process.exit(error.status);
  }
  console.error(\`Failed to run portagent: \${error.message}\`);
  process.exit(1);
}
`
  );

  // Create package.json for npm publish
  await writeFile(
    join(outdir, "package.json"),
    JSON.stringify(
      {
        name: "@agentxjs/portagent",
        version: VERSION,
        description: "Portagent - AgentX Portal Application",
        license: "MIT",
        repository: {
          type: "git",
          url: "https://github.com/Deepractice/AgentX.git",
        },
        bin: { portagent: "cli.js" },
        files: ["cli.js", "bin", "public", "claude-code"],
        publishConfig: { access: "public" },
      },
      null,
      2
    )
  );

  // Copy README
  try {
    await cp("./README.md", join(outdir, "README.md"));
  } catch {
    // README might not exist
  }

  // Summary
  console.log("\n📊 Build Summary:");
  console.log("─".repeat(50));

  let totalSize = 0;
  for (const { platform, ext } of BINARY_TARGETS) {
    const binName = `portagent-${platform}${ext}`;
    const binPath = join(outdir, "bin", binName);
    try {
      const size = (await Bun.file(binPath).size) / 1024 / 1024;
      totalSize += size;
      console.log(`   ${platform.padEnd(20)} ${size.toFixed(1)} MB`);
    } catch {
      console.log(`   ${platform.padEnd(20)} (not built)`);
    }
  }

  console.log("─".repeat(50));
  console.log(`   ${"Total".padEnd(20)} ${totalSize.toFixed(1)} MB`);
  console.log(`\n✅ Package ready in ${outdir}/`);
  console.log("\nTo test locally:");
  console.log(`  node ${outdir}/cli.js --help`);
  console.log("\nTo publish:");
  console.log(`  cd ${outdir} && npm publish`);
}

// Main - Always build binaries (portagent is an app, not a library)
await buildBinaries();
