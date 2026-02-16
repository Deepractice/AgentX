/**
 * Unified environment configuration for devtools
 *
 * Single source of truth for API credentials and model settings.
 * Automatically loads .env / .env.local from monorepo root on import.
 *
 * All devtools modules (VCR, BDD, Devtools SDK) should use this
 * instead of reading process.env directly.
 *
 * @example
 * ```ts
 * import { env } from "@agentxjs/devtools";
 *
 * const driver = createMonoDriver({
 *   apiKey: env.apiKey!,
 *   baseUrl: env.baseUrl,
 *   model: env.model,
 * });
 * ```
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

// ============================================================================
// Auto-load .env files from monorepo root
// ============================================================================

function loadEnvFile(filePath: string): void {
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

function findMonorepoRoot(): string | null {
  let dir = process.cwd();
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

// Load on import — cwd first, then monorepo root
const cwd = process.cwd();
loadEnvFile(resolve(cwd, ".env"));
loadEnvFile(resolve(cwd, ".env.local"));

const monorepoRoot = findMonorepoRoot();
if (monorepoRoot && monorepoRoot !== cwd) {
  loadEnvFile(resolve(monorepoRoot, ".env"));
  loadEnvFile(resolve(monorepoRoot, ".env.local"));
}

// ============================================================================
// Public API
// ============================================================================

export const env = {
  /** Deepractice API key */
  get apiKey(): string | undefined {
    return process.env.DEEPRACTICE_API_KEY;
  },

  /** Deepractice API base URL */
  get baseUrl(): string | undefined {
    return process.env.DEEPRACTICE_BASE_URL;
  },

  /** Model identifier */
  get model(): string {
    return process.env.DEEPRACTICE_MODEL || "claude-haiku-4-5-20251001";
  },
};
