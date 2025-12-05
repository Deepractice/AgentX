/**
 * AgentAPI - Running agent management
 *
 * Agent is a running conversation instance created from a Session.
 * Agent is pure - it only handles conversation, no recording concern.
 *
 * Hierarchy: Container → Session → Agent
 *
 * Note: Agents are created via SessionAPI.run(), not directly through AgentAPI.
 *
 * @example
 * ```typescript
 * // Get a running agent
 * const agent = agentx.runtime.agents.get(agentId);
 *
 * // List all running agents
 * const agents = agentx.runtime.agents.list();
 *
 * // Destroy an agent
 * await agentx.runtime.agents.destroy(agentId);
 * ```
 */

import type { Agent } from "~/agent";

/**
 * AgentAPI - Running agent query and lifecycle
 */
export interface AgentAPI {
  /**
   * Get a running agent by ID
   *
   * @param agentId - Agent identifier
   * @returns Agent instance or undefined if not found/not running
   */
  get(agentId: string): Agent | undefined;

  /**
   * List all running agents
   *
   * @returns Array of all running agent instances
   */
  list(): Agent[];

  /**
   * Destroy a running agent
   *
   * Stops the agent and releases resources.
   * Session data is preserved.
   *
   * @param agentId - Agent identifier
   */
  destroy(agentId: string): Promise<void>;
}
