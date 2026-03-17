/**
 * AgentOS Module
 *
 * Unified operating system abstraction for agents.
 * Combines file system (fs), shell (sh), and environment (env).
 *
 * Usage:
 * ```typescript
 * import type { AgentOS, OSProvider } from "@agentxjs/core/os";
 * import { createOSTools } from "@agentxjs/core/os";
 *
 * // Platform creates the OS
 * const os = await osProvider.create(osId);
 *
 * // Generate tools for the agent
 * const tools = createOSTools(os);
 *
 * // Agent uses the tools: read, write, edit, sh, start
 * ```
 */

export { createOSTools } from "./tools";
export type {
  AgentOS,
  Environment,
  ExecOptions,
  ExecResult,
  FileEntry,
  FileStat,
  FileSystem,
  FileType,
  OSProvider,
  ProcessHandle,
  ProcessInfo,
  ReadOptions,
  Shell,
  StartOptions,
} from "./types";
