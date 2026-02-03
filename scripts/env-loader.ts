/**
 * Global env loader - preloaded by Bun
 * Loads .env.local from monorepo root
 */

import { resolve, dirname } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function findMonorepoRoot(startDir: string): string | null {
  let dir = startDir;
  while (dir !== "/") {
    // Check for monorepo markers
    if (existsSync(resolve(dir, "turbo.json")) || existsSync(resolve(dir, "bun.lockb"))) {
      return dir;
    }
    dir = dirname(dir);
  }
  return null;
}

function loadEnvFile(filePath: string): void {
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, "");
      // Don't override existing env vars
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }
}

// Find and load .env.local from monorepo root
const root = findMonorepoRoot(process.cwd());
if (root) {
  loadEnvFile(resolve(root, ".env.local"));
}
