/**
 * Bash Module
 *
 * Abstraction for command execution capability.
 * Platform packages provide concrete implementations.
 *
 * Usage:
 * ```typescript
 * import type { BashProvider, BashResult } from "@agentxjs/core/bash";
 *
 * // Platform provides implementation
 * const bash: BashProvider = platform.bashProvider;
 *
 * const result = await bash.execute("echo hello", { cwd: "/tmp" });
 * console.log(result.stdout);  // "hello\n"
 * console.log(result.exitCode); // 0
 * ```
 */

export { createBashTool } from "./tool";
export type { BashOptions, BashProvider, BashResult } from "./types";
