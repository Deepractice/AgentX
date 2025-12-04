/**
 * AgentDriver - Message Processing Interface
 *
 * AgentDriver is a pure message processor.
 * It receives user messages and yields DriveableEvents.
 *
 * Key Design:
 * - One Agent = One Driver instance
 * - Driver only handles message processing
 * - Lifecycle management is Container's responsibility
 * - Resume/history is Container's responsibility
 *
 * Type Relationship:
 * ```
 * EnvironmentEvent (all external perceptions)
 * │
 * ├── DriveableEvent (can drive Agent) ← Driver outputs this
 * │   └── MessageStartEvent, TextDeltaEvent, ToolCallEvent...
 * │
 * └── ConnectionEvent (network status only)
 *     └── ConnectedEvent, DisconnectedEvent
 * ```
 *
 * @example
 * ```typescript
 * class ClaudeDriver implements AgentDriver {
 *   readonly name = "ClaudeDriver";
 *
 *   async *receive(message: UserMessage) {
 *     const stream = this.client.messages.stream({
 *       model: "claude-sonnet-4-20250514",
 *       messages: [{ role: "user", content: message.content }],
 *     });
 *
 *     for await (const chunk of stream) {
 *       yield transformToDriveableEvent(chunk);
 *     }
 *   }
 *
 *   interrupt() {
 *     this.abortController.abort();
 *   }
 * }
 * ```
 */

import type { DriveableEvent } from "~/ecosystem/event/environment/DriveableEvent";
import type { UserMessage } from "~/ecosystem/runtime/agent/message";

/**
 * AgentDriver interface
 *
 * A message processor that receives user messages and yields DriveableEvents.
 * Lifecycle (creation, resume, destruction) is managed by Container.
 */
export interface AgentDriver {
  /**
   * Driver name (for identification and logging)
   */
  readonly name: string;

  /**
   * Optional description
   */
  readonly description?: string;

  /**
   * Receive a user message and yield driveable events
   *
   * @param message - User message to process
   * @returns AsyncIterable of DriveableEvent (events that can drive Agent)
   */
  receive(message: UserMessage): AsyncIterable<DriveableEvent>;

  /**
   * Interrupt the current operation
   *
   * Stops the current receive() operation gracefully.
   * Driver should abort any ongoing requests.
   */
  interrupt(): void;
}
