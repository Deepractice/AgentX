#!/usr/bin/env bun
/**
 * Load all .feature files for a given BDD journey role
 * Usage: bun load-features.ts <role>
 * Roles: maintainer, contributor, developer
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, basename, dirname } from "node:path";

const role = process.argv[2];

if (!role) {
  console.log("Available roles:");
  console.log("  maintainer  - Project rules, conventions, architecture");
  console.log("  contributor - Build, environment, setup specs");
  console.log("  developer   - SDK usage, getting started specs");
  console.log("");
  console.log("Usage: /journey <role>");
  process.exit(1);
}

// Find monorepo root
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

const root = findMonorepoRoot(process.cwd());
if (!root) {
  console.error("Error: Could not find monorepo root");
  process.exit(1);
}

const journeyDir = resolve(root, "bdd/journeys", role);
if (!existsSync(journeyDir)) {
  console.error(`Error: Journey directory not found: ${journeyDir}`);
  console.error("Available roles: maintainer, contributor, developer");
  process.exit(1);
}

const files = readdirSync(journeyDir)
  .filter((f) => f.endsWith(".feature"))
  .sort();

for (const file of files) {
  console.log(`=== ${file} ===`);
  console.log(readFileSync(resolve(journeyDir, file), "utf-8"));
  console.log("");
}

console.log(`--- Loaded ${files.length} feature files from bdd/journeys/${role}/ ---`);
