/**
 * ImageRecord - Storage schema for AgentImage persistence
 *
 * Pure data type representing an Agent snapshot in storage.
 * Contains all information needed to fully restore an Agent:
 * - Runtime context (containerId, agentId)
 * - Configuration (name, systemPrompt)
 * - Conversation history (messages)
 *
 * Workflow:
 * Agent.commit() → ImageRecord (storage) → runtime.images.resume() → Agent
 */

/**
 * Image storage record
 *
 * Stores the complete frozen snapshot of an Agent's state.
 */
export interface ImageRecord {
  /**
   * Unique image identifier
   * Pattern: `img_${nanoid()}`
   */
  imageId: string;

  /**
   * Container ID where this agent was running
   */
  containerId: string;

  /**
   * Original agent ID (for traceability)
   */
  agentId: string;

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

  /**
   * Serialized messages (JSON array)
   * Frozen conversation history
   */
  messages: Record<string, unknown>[];

  /**
   * Parent image ID (if derived from another image)
   */
  parentImageId?: string;

  /**
   * Creation timestamp (Unix milliseconds)
   */
  createdAt: number;
}
