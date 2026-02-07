#!/usr/bin/env node
/**
 * BDD CLI wrapper for cucumber-js
 *
 * Usage:
 *   bdd                              # Run all tests
 *   bdd path/to/file.feature         # Run specific feature file
 *   bdd path/to/file.feature:10      # Run specific scenario by line
 *   bdd --tags @contributor           # Run specific tags
 *   bdd --tags "@dev and not @slow"   # Tag expression
 *   bdd --name "token usage"          # Filter by scenario name (regex)
 *   bdd --dry-run                     # Validate without executing
 *   bdd --config path                 # Custom config (default: bdd/cucumber.js)
 */

import { spawn } from "node:child_process";
import { resolve, dirname, relative } from "node:path";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env files (like dotenv but zero dependencies)
function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

// Find monorepo root by walking up to find the root package.json with workspaces
function findMonorepoRoot(startDir: string): string | null {
  let dir = startDir;
  while (true) {
    const pkgPath = resolve(dir, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
        if (pkg.workspaces) return dir;
      } catch {}
    }
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

const cwd = process.cwd();

// Load .env files from cwd first, then monorepo root
loadEnvFile(resolve(cwd, ".env"));
loadEnvFile(resolve(cwd, ".env.local"));

const monorepoRoot = findMonorepoRoot(cwd);
if (monorepoRoot && monorepoRoot !== cwd) {
  loadEnvFile(resolve(monorepoRoot, ".env"));
  loadEnvFile(resolve(monorepoRoot, ".env.local"));
}

const args = process.argv.slice(2);

// Extract --config
let configPath = "bdd/cucumber.js";
const configIndex = args.indexOf("--config");
if (configIndex !== -1 && args[configIndex + 1]) {
  configPath = args[configIndex + 1];
  args.splice(configIndex, 2);
}

// Check if config exists
const fullConfigPath = resolve(cwd, configPath);
if (!existsSync(fullConfigPath)) {
  console.error(`Config not found: ${fullConfigPath}`);
  console.error("Create bdd/cucumber.js or specify --config path");
  process.exit(1);
}

// Separate positional args (feature files/lines) from flags
const featurePaths: string[] = [];
const flags: string[] = [];

for (const arg of args) {
  if (arg.startsWith("-")) {
    flags.push(arg);
  } else if (arg.endsWith(".feature") || arg.includes(".feature:")) {
    featurePaths.push(arg);
  } else {
    // Could be a flag value (e.g. after --tags), keep as-is
    flags.push(arg);
  }
}

// Find cucumber-js binary
const cucumberPaths = [
  resolve(cwd, "node_modules/.bin/cucumber-js"),
  resolve(__dirname, "../../../.bin/cucumber-js"),
  "cucumber-js",
];
const cucumberBin =
  cucumberPaths.find((p) => p === "cucumber-js" || existsSync(p)) ||
  "cucumber-js";

const rootNodeModules = resolve(cwd, "node_modules");

// When feature paths are specified, generate a temp config that overrides
// the original config's `paths` — cucumber-js config.paths takes precedence
// over positional args, so we must override it in the config itself.
let effectiveConfig = configPath;
let tempConfigPath: string | null = null;

if (featurePaths.length > 0) {
  const configRelPath = relative(dirname(resolve(cwd, "bdd/.tmp-cucumber.js")), fullConfigPath)
    .replace(/\\/g, "/");
  const pathsJson = JSON.stringify(featurePaths);
  const tempContent = [
    `import config from "./${configRelPath}";`,
    `export default { ...config.default ?? config, paths: ${pathsJson} };`,
    "",
  ].join("\n");

  tempConfigPath = resolve(cwd, "bdd/.tmp-cucumber.js");
  writeFileSync(tempConfigPath, tempContent);
  effectiveConfig = "bdd/.tmp-cucumber.js";
}

// Build cucumber args
const cucumberArgs = ["--config", effectiveConfig, ...flags];

const child = spawn(cucumberBin, cucumberArgs, {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_OPTIONS: "--import tsx",
    NODE_PATH: rootNodeModules,
  },
});

child.on("close", (code) => {
  // Clean up temp config
  if (tempConfigPath && existsSync(tempConfigPath)) {
    try {
      unlinkSync(tempConfigPath);
    } catch {}
  }
  process.exit(code ?? 0);
});
