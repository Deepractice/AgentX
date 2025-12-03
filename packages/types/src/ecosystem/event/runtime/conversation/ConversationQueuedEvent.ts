import type { RuntimeEvent } from "../RuntimeEvent";

/**
 * Event indicating a message has been queued for processing.
 * Converted from ConversationQueuedStateEvent (Domain Event).
 */
export interface ConversationQueuedEvent
  extends RuntimeEvent<"conversation_queued", ConversationQueuedEventData> {}

export interface ConversationQueuedEventData {
  /** The agent processing this conversation */
  readonly agentId: string;

  /** Position in queue (if applicable) */
  readonly queuePosition?: number;
}
