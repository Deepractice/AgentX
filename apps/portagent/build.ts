/**
 * Bun Build Script for @agentxjs/portagent
 *
 * Usage:
 *   bun run build.ts           # Build ESM modules (default, for npm publish)
 *   bun run build.ts --binary  # Build standalone binaries for all platforms
 *   bun run build.ts --bin     # Same as --binary
 */

import { cp, mkdir, writeFile, rm } from "fs/promises";
import { join } from "path";

const args = process.argv.slice(2);
const buildBinary = args.includes("--binary") || args.includes("--bin");

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

async function buildESM() {
  console.log("🚀 Building @agentxjs/portagent (ESM-only)\n");

  // Build server
  console.log("📦 Building server/index...");
  const serverResult = await Bun.build({
    entrypoints: ["src/server/index.ts"],
    outdir,
    format: "esm",
    target: "node",
    sourcemap: "external",
    minify: false,
    naming: { entry: "server/index.js" },
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

  // Build CLI
  console.log("📦 Building cli/index...");
  const cliResult = await Bun.build({
    entrypoints: ["src/cli/index.ts"],
    outdir,
    format: "esm",
    target: "node",
    sourcemap: "external",
    minify: false,
    naming: { entry: "cli/index.js" },
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

  // Build frontend
  await buildFrontend();

  // Check results
  const results = [serverResult, cliResult];
  let hasErrors = false;
  for (const result of results) {
    if (!result.success) {
      console.error("❌ Build failed:");
      for (const log of result.logs) console.error(log);
      hasErrors = true;
    }
  }

  if (hasErrors) process.exit(1);

  console.log(`✅ Server: ${serverResult.outputs.length} files`);
  console.log(`✅ CLI: ${cliResult.outputs.length} files`);
  console.log("🎉 ESM build complete!");
}

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
  console.log(`\n🚀 Building Portagent v${VERSION} binaries\n`);

  // Clean and prepare
  await rm(`${outdir}/binaries`, { recursive: true, force: true });
  await mkdir(`${outdir}/binaries`, { recursive: true });

  // Build frontend first
  await buildFrontend();

  // Build binary for each platform
  console.log("\n📦 Building platform binaries...\n");

  for (const { platform, target, ext } of BINARY_TARGETS) {
    console.log(`   🔨 ${platform}...`);

    const pkgDir = join(outdir, "binaries", `portagent-${platform}`);
    const binDir = join(pkgDir, "bin");
    await mkdir(binDir, { recursive: true });

    const binPath = join(binDir, `portagent${ext}`);

    try {
      // Build external args
      const externalArgs = BINARY_EXTERNALS.flatMap((pkg) => ["--external", pkg]);

      await Bun.$`bun build --compile \
        --target ${target} \
        --minify \
        ${externalArgs} \
        ./src/cli/index.ts \
        --outfile ${binPath}`.quiet();

      console.log(`      ✅ Built`);
    } catch (error: any) {
      console.error(`      ❌ Failed:`, error.stderr || error.message);
      continue;
    }

    // Create platform package.json
    const osName = platform.startsWith("windows") ? "win32" : platform.split("-")[0];
    const cpuName = platform.split("-")[1];

    await writeFile(
      join(pkgDir, "package.json"),
      JSON.stringify(
        {
          name: `@agentxjs/portagent-${platform}`,
          version: VERSION,
          description: `Portagent binary for ${platform}`,
          license: "MIT",
          repository: {
            type: "git",
            url: "https://github.com/Deepractice/AgentX.git",
          },
          os: [osName],
          cpu: [cpuName],
          files: ["bin"],
          publishConfig: { access: "public" },
        },
        null,
        2
      )
    );
  }

  // Create main wrapper package
  console.log("\n📦 Creating main wrapper package...");
  const mainPkgDir = join(outdir, "binaries", "portagent");
  const mainBinDir = join(mainPkgDir, "bin");
  await mkdir(mainBinDir, { recursive: true });

  // Create wrapper script
  await writeFile(
    join(mainBinDir, "portagent.js"),
    `#!/usr/bin/env node
import { execFileSync } from "child_process";
import { createRequire } from "module";
import { dirname, join } from "path";

const PLATFORMS = {
  "darwin-arm64": "@agentxjs/portagent-darwin-arm64",
  "darwin-x64": "@agentxjs/portagent-darwin-x64",
  "linux-x64": "@agentxjs/portagent-linux-x64",
  "linux-arm64": "@agentxjs/portagent-linux-arm64",
  "win32-x64": "@agentxjs/portagent-windows-x64",
};

const platformKey = \`\${process.platform}-\${process.arch}\`;
const pkgName = PLATFORMS[platformKey];

if (!pkgName) {
  console.error(\`Unsupported platform: \${platformKey}\`);
  console.error(\`Supported: \${Object.keys(PLATFORMS).join(", ")}\`);
  process.exit(1);
}

try {
  const require = createRequire(import.meta.url);
  const pkgJsonPath = require.resolve(\`\${pkgName}/package.json\`);
  const pkgDir = dirname(pkgJsonPath);
  const ext = process.platform === "win32" ? ".exe" : "";
  const binPath = join(pkgDir, "bin", \`portagent\${ext}\`);

  execFileSync(binPath, process.argv.slice(2), { stdio: "inherit" });
} catch (error) {
  if (error.code === "MODULE_NOT_FOUND") {
    console.error(\`Platform package not found: \${pkgName}\`);
    console.error("\\nTry reinstalling: npm install -g @agentxjs/portagent");
  } else if (error.status !== undefined) {
    process.exit(error.status);
  } else {
    console.error(\`Failed to run portagent: \${error.message}\`);
  }
  process.exit(1);
}
`
  );

  // Create main package.json
  const optionalDeps: Record<string, string> = {};
  for (const { platform } of BINARY_TARGETS) {
    optionalDeps[`@agentxjs/portagent-${platform}`] = VERSION;
  }

  await writeFile(
    join(mainPkgDir, "package.json"),
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
        type: "module",
        bin: { portagent: "./bin/portagent.js" },
        files: ["bin"],
        optionalDependencies: optionalDeps,
        publishConfig: { access: "public" },
      },
      null,
      2
    )
  );

  // Summary
  console.log("\n📊 Build Summary:");
  console.log("─".repeat(50));

  for (const { platform, ext } of BINARY_TARGETS) {
    const binPath = join(outdir, "binaries", `portagent-${platform}`, "bin", `portagent${ext}`);
    try {
      const size = (await Bun.file(binPath).size) / 1024 / 1024;
      console.log(`   ${platform.padEnd(20)} ${size.toFixed(1)} MB`);
    } catch {
      console.log(`   ${platform.padEnd(20)} (not built)`);
    }
  }

  console.log("─".repeat(50));
  console.log(`\n✅ Binaries ready in ${outdir}/binaries/`);
  console.log("\nTo publish:");
  console.log(`  cd ${outdir}/binaries`);
  console.log("  for d in */; do (cd $d && npm publish); done");
}

// Main
if (buildBinary) {
  await buildBinaries();
} else {
  await buildESM();
}
