/**
 * AgentImage - Agent runtime snapshot (persisted state)
 *
 * AgentImage is a complete snapshot of an Agent's state at a point in time.
 * It contains all information needed to fully restore an Agent:
 * - Runtime context (containerId, agentId)
 * - Configuration (name, systemPrompt)
 * - Conversation history (messages)
 *
 * AgentImage is an object with behavior - it can restore itself to a running Agent.
 *
 * Workflow:
 * ```
 * Agent → runtime.images.snapshot(agent) → AgentImage
 *                                              ↓
 *                                         image.resume()
 *                                              ↓
 *                                         New Agent (restored)
 * ```
 *
 * @example
 * ```typescript
 * // Create and use agent
 * const agent = await runtime.agents.run(containerId, config);
 * await agent.receive("Hello!");
 *
 * // Snapshot
 * const image = await runtime.images.snapshot(agent);
 *
 * // Later: restore from image
 * const restoredAgent = await image.resume();
 * ```
 */

import type { UserMessage } from "~/agent/message/UserMessage";
import type { AssistantMessage } from "~/agent/message/AssistantMessage";
import type { ToolCallMessage } from "~/agent/message/ToolCallMessage";
import type { ToolResultMessage } from "~/agent/message/ToolResultMessage";
import type { Agent } from "./Agent";

/**
 * Union type of all message types that can be stored in an Image
 */
export type ImageMessage = UserMessage | AssistantMessage | ToolCallMessage | ToolResultMessage;

/**
 * AgentImage - Complete snapshot of Agent state with behavior
 */
export interface AgentImage {
  /**
   * Unique image identifier
   * Pattern: `img_${nanoid()}`
   */
  readonly imageId: string;

  /**
   * Container ID where this agent was running
   */
  readonly containerId: string;

  /**
   * Original agent ID (for traceability)
   */
  readonly agentId: string;

  /**
   * Agent name
   */
  readonly name: string;

  /**
   * Agent description (optional)
   */
  readonly description?: string;

  /**
   * System prompt - controls agent behavior
   */
  readonly systemPrompt?: string;

  /**
   * Conversation history snapshot
   */
  readonly messages: ImageMessage[];

  /**
   * Parent image ID (if this image was derived from another)
   */
  readonly parentImageId?: string;

  /**
   * When this image was created (Unix milliseconds)
   */
  readonly createdAt: number;

  // ==================== Behavior ====================

  /**
   * Resume an agent from this image
   *
   * Creates a new Agent instance with the saved configuration
   * and conversation history restored.
   *
   * @throws Error if container not found
   * @returns New Agent instance
   */
  resume(): Promise<Agent>;
}
