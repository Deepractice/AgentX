/**
 * Path Module - Cross-runtime path utilities
 *
 * @example
 * ```typescript
 * import { getModuleDir, getPackageRoot, getMonorepoRoot } from "@agentxjs/common/path";
 *
 * const __dirname = getModuleDir(import.meta);
 * const pkgRoot = getPackageRoot(import.meta);
 * const monoRoot = getMonorepoRoot(import.meta);
 * ```
 */

export {
  getModuleDir,
  getPackageRoot,
  getMonorepoRoot,
  resolveFromRoot,
  resolveFromPackage,
} from "./path";
