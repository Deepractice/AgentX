import type { RuntimeEvent } from "../RuntimeEvent";

/**
 * Event indicating a conversation was interrupted.
 * Converted from ConversationInterruptedStateEvent (Domain Event).
 */
export interface ConversationInterruptedEvent
  extends RuntimeEvent<"conversation_interrupted", ConversationInterruptedEventData> {}

export interface ConversationInterruptedEventData {
  /** The agent whose conversation was interrupted */
  readonly agentId: string;

  /** Reason for interruption */
  readonly reason?: string;
}
