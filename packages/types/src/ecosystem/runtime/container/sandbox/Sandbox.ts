/**
 * Sandbox
 *
 * Pure resource isolation layer for an Agent.
 * Isolates two types of resources: Workspace and LLM.
 *
 * Architecture:
 * ```
 * ┌─────────────────────────────────────────────────────┐
 * │                  Container                           │
 * │  ┌───────────────────────────────────────────────┐  │
 * │  │  Agent 1 ──────→ Sandbox 1 (Workspace + LLM)  │  │
 * │  │  Agent 2 ──────→ Sandbox 2 (Workspace + LLM)  │  │
 * │  │  Agent 3 ──────→ Sandbox 3 (Workspace + LLM)  │  │
 * │  └───────────────────────────────────────────────┘  │
 * └─────────────────────────────────────────────────────┘
 * ```
 *
 * Flow:
 * 1. Create Sandbox (allocate Workspace + LLM resources)
 * 2. Create Agent with Sandbox reference
 * 3. Agent.sandbox provides resources to Driver
 * 4. Container registers Agent
 */

import type { Workspace } from "./workspace";
import type { LLMProvider } from "./llm";

/**
 * Sandbox - Pure resource isolation
 *
 * Isolates resources for an Agent:
 * - Workspace: Isolated working directory
 * - LLM: Large Language Model provider
 *
 * Note: Agent holds Sandbox, not vice versa (avoids circular dependency)
 */
export interface Sandbox {
  /** Sandbox identifier */
  readonly name: string;

  /** Isolated workspace for file operations */
  readonly workspace: Workspace;

  /** LLM provider resource */
  readonly llm: LLMProvider;
}
