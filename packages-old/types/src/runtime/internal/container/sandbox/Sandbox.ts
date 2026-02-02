/**
 * Sandbox
 *
 * Pure resource isolation layer for an Agent.
 * Isolates external tool resources: Workdir and MCP.
 *
 * Architecture:
 * ```
 * ┌─────────────────────────────────────────────────────────┐
 * │                  Container                              │
 * │  ┌───────────────────────────────────────────────────┐  │
 * │  │  Agent ──→ Sandbox (Workdir + MCP)               │  │
 * │  │        ──→ LLM (separate from Sandbox)            │  │
 * │  └───────────────────────────────────────────────────┘  │
 * └─────────────────────────────────────────────────────────┘
 * ```
 *
 * Note: LLM is at the same level as Sandbox, not inside it.
 * Sandbox focuses on external tool isolation (workdir, MCP tools).
 */

import type { Workdir } from "./workdir";

/**
 * Sandbox - External tool resource isolation
 *
 * Isolates external tool resources for an Agent:
 * - Workdir: Isolated working directory
 * - MCP: Model Context Protocol tools (future)
 *
 * Note: LLM is NOT part of Sandbox - it's at container level.
 */
export interface Sandbox {
  /** Sandbox identifier */
  readonly name: string;

  /** Isolated working directory for file operations */
  readonly workdir: Workdir;
}
