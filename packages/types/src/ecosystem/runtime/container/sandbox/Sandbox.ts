/**
 * Sandbox
 *
 * Pure resource isolation layer for an Agent.
 * Isolates external tool resources: Workspace and MCP.
 *
 * Architecture:
 * ```
 * ┌─────────────────────────────────────────────────────────┐
 * │                  Container                              │
 * │  ┌───────────────────────────────────────────────────┐  │
 * │  │  Agent ──→ Sandbox (Workspace + MCP)              │  │
 * │  │        ──→ LLM (separate from Sandbox)            │  │
 * │  └───────────────────────────────────────────────────┘  │
 * └─────────────────────────────────────────────────────────┘
 * ```
 *
 * Note: LLM is at the same level as Sandbox, not inside it.
 * Sandbox focuses on external tool isolation (workspace, MCP tools).
 */

import type { Workspace } from "./workspace";

/**
 * Sandbox - External tool resource isolation
 *
 * Isolates external tool resources for an Agent:
 * - Workspace: Isolated working directory
 * - MCP: Model Context Protocol tools (future)
 *
 * Note: LLM is NOT part of Sandbox - it's at container level.
 */
export interface Sandbox {
  /** Sandbox identifier */
  readonly name: string;

  /** Isolated workspace for file operations */
  readonly workspace: Workspace;
}
