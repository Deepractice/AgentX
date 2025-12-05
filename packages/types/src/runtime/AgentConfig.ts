/**
 * AgentConfig - Runtime configuration for Agent instance
 *
 * Contains the configuration needed to run an Agent.
 * Copied from AgentDefinition when Agent is created.
 *
 * Separation of concerns:
 * - AgentDefinition (application layer) = static template
 * - AgentConfig (runtime layer) = runtime configuration
 *
 * This keeps runtime layer independent of application layer.
 */
export interface AgentConfig {
  /**
   * Agent name
   */
  name: string;

  /**
   * Agent description (optional)
   */
  description?: string;

  /**
   * System prompt - controls agent behavior
   */
  systemPrompt?: string;
}
