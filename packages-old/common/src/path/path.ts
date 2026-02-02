/**
 * Path Utilities - Cross-runtime path helpers
 *
 * Works in both Bun and Node.js environments.
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

declare const Bun: unknown;

/**
 * Get the directory of the current module
 *
 * @param meta - Pass `import.meta` from your module
 * @returns Absolute path to the directory containing the module
 *
 * @example
 * ```typescript
 * import { getModuleDir } from "@agentxjs/common/path";
 *
 * const __dirname = getModuleDir(import.meta);
 * ```
 */
export function getModuleDir(meta: ImportMeta): string {
  // Bun has import.meta.dir
  if ((meta as any).dir) {
    return (meta as any).dir;
  }
  // Node.js: convert file:// URL to path
  return dirname(fileURLToPath(meta.url));
}

/**
 * Get the root directory of the current package (where package.json is)
 *
 * @param meta - Pass `import.meta` from your module
 * @returns Absolute path to the package root
 *
 * @example
 * ```typescript
 * import { getPackageRoot } from "@agentxjs/common/path";
 *
 * const pkgRoot = getPackageRoot(import.meta);
 * // e.g., /Users/sean/AgentX/packages/queue
 * ```
 */
export function getPackageRoot(meta: ImportMeta): string {
  const startDir = getModuleDir(meta);
  return findUp(startDir, "package.json");
}

/**
 * Get the monorepo root directory (where pnpm-workspace.yaml or root package.json is)
 *
 * @param meta - Pass `import.meta` from your module
 * @returns Absolute path to the monorepo root
 *
 * @example
 * ```typescript
 * import { getMonorepoRoot } from "@agentxjs/common/path";
 *
 * const root = getMonorepoRoot(import.meta);
 * // e.g., /Users/sean/AgentX
 * ```
 */
export function getMonorepoRoot(meta: ImportMeta): string {
  const startDir = getModuleDir(meta);

  // Try common monorepo markers in order
  const markers = [
    "pnpm-workspace.yaml", // pnpm monorepo
    "pnpm-lock.yaml", // pnpm
    "bun.lock", // bun workspace
    "bun.lockb", // bun workspace (binary)
    "package-lock.json", // npm workspace
    "yarn.lock", // yarn workspace
  ];

  for (const marker of markers) {
    try {
      return findUp(startDir, marker);
    } catch {
      // Try next marker
    }
  }

  // Last resort: find root package.json
  return findUp(startDir, "package.json");
}

/**
 * Resolve a path relative to the monorepo root
 *
 * @param meta - Pass `import.meta` from your module
 * @param paths - Path segments to resolve
 * @returns Absolute resolved path
 *
 * @example
 * ```typescript
 * import { resolveFromRoot } from "@agentxjs/common/path";
 *
 * const dataDir = resolveFromRoot(import.meta, "data");
 * // e.g., /Users/sean/AgentX/data
 *
 * const config = resolveFromRoot(import.meta, "packages", "config", "settings.json");
 * // e.g., /Users/sean/AgentX/packages/config/settings.json
 * ```
 */
export function resolveFromRoot(meta: ImportMeta, ...paths: string[]): string {
  const root = getMonorepoRoot(meta);
  return resolve(root, ...paths);
}

/**
 * Resolve a path relative to the current package root
 *
 * @param meta - Pass `import.meta` from your module
 * @param paths - Path segments to resolve
 * @returns Absolute resolved path
 *
 * @example
 * ```typescript
 * import { resolveFromPackage } from "@agentxjs/common/path";
 *
 * const testsDir = resolveFromPackage(import.meta, "tests");
 * // e.g., /Users/sean/AgentX/packages/queue/tests
 *
 * const fixtures = resolveFromPackage(import.meta, "tests", "fixtures", "data.json");
 * // e.g., /Users/sean/AgentX/packages/queue/tests/fixtures/data.json
 * ```
 */
export function resolveFromPackage(meta: ImportMeta, ...paths: string[]): string {
  const pkgRoot = getPackageRoot(meta);
  return resolve(pkgRoot, ...paths);
}

/**
 * Find a file by walking up the directory tree
 */
function findUp(startDir: string, filename: string): string {
  let current = startDir;
  const root = resolve("/");

  while (current !== root) {
    const candidate = resolve(current, filename);
    if (existsSync(candidate)) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }

  throw new Error(`Could not find ${filename} starting from ${startDir}`);
}
