#!/usr/bin/env node
/**
 * BDD CLI wrapper for cucumber-js
 *
 * Usage:
 *   bdd                    # Run all tests
 *   bdd --tags @contributor # Run specific tags
 *   bdd --config path      # Custom config path (default: bdd/cucumber.js)
 */

import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { existsSync, readFileSync } from "node:fs";
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
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    // Don't overwrite existing env vars
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
    if (parent === dir) return null; // reached filesystem root
    dir = parent;
  }
}

const cwd = process.cwd();

// Load .env files from cwd first
loadEnvFile(resolve(cwd, ".env"));
loadEnvFile(resolve(cwd, ".env.local"));

// Also load from monorepo root (if different from cwd)
const monorepoRoot = findMonorepoRoot(cwd);
if (monorepoRoot && monorepoRoot !== cwd) {
  loadEnvFile(resolve(monorepoRoot, ".env"));
  loadEnvFile(resolve(monorepoRoot, ".env.local"));
}

const args = process.argv.slice(2);

// Find config file
let configPath = "bdd/cucumber.js";
const configIndex = args.indexOf("--config");
if (configIndex !== -1 && args[configIndex + 1]) {
  configPath = args[configIndex + 1];
  args.splice(configIndex, 2);
}

// Check if config exists
const fullConfigPath = resolve(process.cwd(), configPath);
if (!existsSync(fullConfigPath)) {
  console.error(`Config not found: ${fullConfigPath}`);
  console.error("Create bdd/cucumber.js or specify --config path");
  process.exit(1);
}

// Find cucumber-js binary — check common locations
const cucumberPaths = [
  resolve(process.cwd(), "node_modules/.bin/cucumber-js"),
  resolve(__dirname, "../../../.bin/cucumber-js"),
  "cucumber-js", // fallback to PATH
];
const cucumberBin = cucumberPaths.find((p) => p === "cucumber-js" || existsSync(p)) || "cucumber-js";

// Ensure Node.js can resolve workspace packages (Bun hoists to root node_modules)
const rootNodeModules = resolve(process.cwd(), "node_modules");

// Run cucumber-js with tsx loader
const cucumberArgs = ["--config", configPath, ...args];

const child = spawn(cucumberBin, cucumberArgs, {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_OPTIONS: "--import tsx",
    NODE_PATH: rootNodeModules,
  },
});

child.on("close", (code) => {
  process.exit(code ?? 0);
});
