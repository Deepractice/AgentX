/**
 * AgentManager - Running agent query and management (Runtime API)
 *
 * Docker-style design: Agent creation happens via Image.run() or Session.resume(),
 * NOT via AgentManager.create(). AgentManager only queries and manages running agents.
 *
 * ```
 * Docker analogy:
 * - docker ps         → agentx.agents.list()
 * - docker inspect    → agentx.agents.get(id)
 * - docker rm         → agentx.agents.destroy(id)
 * - docker run <image> → agentx.images.run(imageId) or session.resume()
 * ```
 *
 * @example
 * ```typescript
 * // Agent creation via Image or Session (NOT via agents.create!)
 * const agent = await agentx.images.run(imageId);
 * // or
 * const session = await agentx.sessions.create(imageId, userId);
 * const agent = await session.resume();
 *
 * // Query and manage running agents
 * agentx.agents.list();           // List all running agents
 * agentx.agents.get(agentId);     // Get specific agent
 * await agentx.agents.destroy(agentId);  // Destroy agent
 * ```
 */

import type { Agent } from "~/ecosystem/runtime/agent/Agent";

/**
 * Agent query and management interface (Runtime only)
 *
 * Note: No create() method. Agent creation happens via:
 * - agentx.images.run(imageId) - Run agent from image
 * - session.resume() - Resume agent from session
 */
export interface AgentManager {
  /**
   * Get an existing agent by ID
   */
  get(agentId: string): Agent | undefined;

  /**
   * Check if an agent exists
   */
  has(agentId: string): boolean;

  /**
   * List all running agents
   */
  list(): Agent[];

  /**
   * Destroy an agent by ID
   */
  destroy(agentId: string): Promise<void>;

  /**
   * Destroy all agents
   */
  destroyAll(): Promise<void>;
}
