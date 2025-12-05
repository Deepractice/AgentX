/**
 * Container - Runtime environment for Agent instances
 *
 * Container is a runtime isolation boundary where Agents live and work.
 * Each Container manages multiple Agents, each with its own Sandbox.
 *
 * Architecture:
 * ```
 * Container
 *   └── Agent 1 ─── Sandbox 1
 *   └── Agent 2 ─── Sandbox 2
 *   └── Agent 3 ─── Sandbox 3
 * ```
 *
 * Container provides:
 * - Agent lifecycle management (run, destroy)
 * - Sandbox creation per Agent (encapsulated)
 * - Runtime isolation between Containers
 * - Foundation for multi-agent collaboration
 *
 * @example
 * ```typescript
 * // Create container via Runtime
 * const container = runtime.createContainer("container-1");
 *
 * // Run an agent from definition
 * const agent = container.run(definition);
 *
 * // Use the agent
 * agent.on("text_delta", (e) => console.log(e.data.text));
 * await agent.receive("Hello!");
 *
 * // Destroy agent when done
 * await container.destroyAgent(agent.agentId);
 *
 * // Dispose container
 * await container.dispose();
 * ```
 */

import type { Agent } from "~/agent/Agent";
import type { AgentConfig } from "../AgentConfig";

/**
 * Container interface for managing Agent instances at runtime
 */
export interface Container {
  /**
   * Unique container identifier
   */
  readonly containerId: string;

  // ==================== Agent Lifecycle ====================

  /**
   * Run an Agent from a config.
   *
   * Internally creates:
   * - Sandbox (isolated per Agent)
   * - Driver (message processor)
   * - AgentInstance
   *
   * @param config - Agent config (name, systemPrompt, etc.)
   * @returns Running Agent instance
   */
  run(config: AgentConfig): Promise<Agent>;

  /**
   * Get an Agent by ID
   */
  getAgent(agentId: string): Agent | undefined;

  /**
   * Check if an Agent exists in this container
   */
  hasAgent(agentId: string): boolean;

  /**
   * List all Agents in this container
   */
  listAgents(): Agent[];

  /**
   * Get all Agent IDs in this container
   */
  listAgentIds(): string[];

  /**
   * Get the number of Agents in this container
   */
  agentCount(): number;

  /**
   * Destroy an Agent by ID
   *
   * Cleans up Agent resources and removes from container.
   *
   * @param agentId - Agent to destroy
   * @returns true if agent was found and destroyed
   */
  destroyAgent(agentId: string): Promise<boolean>;

  /**
   * Destroy all Agents in this container
   */
  destroyAllAgents(): Promise<void>;

  // ==================== Container Lifecycle ====================

  /**
   * Dispose the container and all its Agents
   */
  dispose(): Promise<void>;
}
