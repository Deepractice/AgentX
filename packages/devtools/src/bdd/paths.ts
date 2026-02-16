/**
 * Unified path utilities for BDD testing
 *
 * Provides consistent path resolution across all packages.
 */

import { existsSync, mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";

// ============================================================================
// Path Resolution
// ============================================================================

/**
 * Find the monorepo root by looking for root package.json with workspaces
 */
export function findMonorepoRoot(startDir: string = process.cwd()): string {
  let dir = startDir;
  while (dir !== "/") {
    const pkgPath = resolve(dir, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = require(pkgPath);
        if (pkg.workspaces || pkg.private === true) {
          // Check if it looks like a monorepo root
          const hasPackages = existsSync(resolve(dir, "packages"));
          const hasApps = existsSync(resolve(dir, "apps"));
          if (hasPackages || hasApps) {
            return dir;
          }
        }
      } catch {
        // Ignore errors
      }
    }
    dir = dirname(dir);
  }
  return startDir;
}

/**
 * Get the current package root (where package.json is)
 */
export function getPackageRoot(startDir: string = process.cwd()): string {
  let dir = startDir;
  while (dir !== "/") {
    if (existsSync(resolve(dir, "package.json"))) {
      return dir;
    }
    dir = dirname(dir);
  }
  return startDir;
}

// ============================================================================
// Standard Paths
// ============================================================================

let _monorepoRoot: string | null = null;
let _packageRoot: string | null = null;
let _tempDir: string | null = null;

/**
 * Monorepo root directory
 */
export function getMonorepoPath(): string {
  if (!_monorepoRoot) {
    _monorepoRoot = findMonorepoRoot();
  }
  return _monorepoRoot;
}

/**
 * Current package root directory
 */
export function getPackagePath(): string {
  if (!_packageRoot) {
    _packageRoot = getPackageRoot();
  }
  return _packageRoot;
}

/**
 * BDD directory for current package
 */
export function getBddPath(): string {
  return resolve(getPackagePath(), "bdd");
}

/**
 * Fixtures directory for current package's BDD tests
 */
export function getFixturesPath(subdir?: string): string {
  const base = resolve(getBddPath(), "fixtures");
  return subdir ? resolve(base, subdir) : base;
}

/**
 * Get or create a temporary directory for tests
 */
export function getTempPath(prefix: string = "bdd-"): string {
  if (!_tempDir) {
    _tempDir = mkdtempSync(resolve(tmpdir(), prefix));
  }
  return _tempDir;
}

/**
 * Ensure a directory exists, creating it if necessary
 */
export function ensureDir(path: string): string {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
  return path;
}

/**
 * Reset cached paths (useful for testing)
 */
export function resetPaths(): void {
  _monorepoRoot = null;
  _packageRoot = null;
  _tempDir = null;
}

// ============================================================================
// Convenience exports
// ============================================================================

export const paths = {
  monorepo: getMonorepoPath,
  package: getPackagePath,
  bdd: getBddPath,
  fixtures: getFixturesPath,
  temp: getTempPath,
  ensure: ensureDir,
  reset: resetPaths,
};
