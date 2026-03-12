/**
 * Context Types — Layer 2 of the three-layer context model
 *
 * Three-layer context model:
 *   Layer 1: System Prompt (fixed, from Image config)
 *   Layer 2: Context (dynamic cognitive context — identity, tools, instructions)
 *   Layer 3: Messages (conversation history, managed by Session)
 *
 * Context provides three things:
 *   - instructions: world-level cognitive framework (fixed per context)
 *   - project(): dynamic state projection (refreshed each turn)
 *   - getTools(): capabilities the context brings (e.g. RoleX tools)
 */

import type { ToolDefinition } from "../driver/types";

/**
 * Context — dynamic cognitive context for an agent.
 *
 * Implementations:
 *   - RolexContext: RoleX role identity + world instructions + tools
 *   - Future: other context providers
 */
export interface Context {
  /** World-level instructions — the cognitive framework. */
  readonly instructions: string;

  /**
   * Project the current cognitive state.
   * Called each turn to get the latest role/identity state.
   */
  project(): Promise<string>;

  /**
   * Get tools provided by this context.
   * These are merged with other tools (bash, MCP, etc.) by the runtime.
   */
  getTools(): ToolDefinition[];
}

/**
 * ContextProvider — factory for creating Context instances.
 *
 * Registered on AgentXPlatform. The runtime calls create(contextId)
 * when an Image with a contextId is run.
 */
export interface ContextProvider {
  /**
   * Create and initialize a Context for the given context ID.
   *
   * @param contextId - Identifier for the context (e.g. RoleX individual ID)
   * @returns Initialized Context ready for use
   */
  create(contextId: string): Promise<Context>;
}
