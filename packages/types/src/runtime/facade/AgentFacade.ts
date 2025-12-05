/**
 * AgentFacade - Running agent management
 *
 * Facade for interacting with running Agent instances.
 * Agent is a running conversation instance created from a Session.
 *
 * Hierarchy: Container → Session → Agent
 *
 * Note: Agents are created via SessionFacade.run(), not directly through AgentFacade.
 * Internal Agent object is not exposed - all interactions go through this facade.
 */

/**
 * Agent info returned by AgentFacade
 *
 * This is a read-only view of the agent state.
 * Use facade methods to interact with the agent.
 */
export interface AgentInfo {
  /**
   * Unique agent identifier
   */
  agentId: string;

  /**
   * Session this agent belongs to
   */
  sessionId: string;

  /**
   * Agent creation timestamp
   */
  createdAt: Date;

  /**
   * Current agent state
   */
  state: "idle" | "thinking" | "responding" | "tool_executing";
}

/**
 * AgentFacade - Running agent query and interaction
 */
export interface AgentFacade {
  /**
   * Get agent info by ID
   *
   * @param agentId - Agent identifier
   * @returns Agent info or undefined if not found/not running
   */
  get(agentId: string): AgentInfo | undefined;

  /**
   * List all running agents
   *
   * @returns Array of all running agent info
   */
  list(): AgentInfo[];

  /**
   * Send a message to the agent
   *
   * @param agentId - Agent identifier
   * @param message - Message content
   * @throws Error if agent not found
   */
  receive(agentId: string, message: string): Promise<void>;

  /**
   * Interrupt the agent's current operation
   *
   * Stops the current operation gracefully.
   * The agent will return to idle state.
   * Silent if agent not found or already idle.
   *
   * @param agentId - Agent identifier
   */
  interrupt(agentId: string): void;

  /**
   * Destroy a running agent
   *
   * Stops the agent and releases resources.
   * Session data is preserved.
   * Silent if agent not found.
   *
   * @param agentId - Agent identifier
   */
  destroy(agentId: string): Promise<void>;
}
