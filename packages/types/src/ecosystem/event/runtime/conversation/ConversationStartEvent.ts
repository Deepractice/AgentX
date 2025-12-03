import type { RuntimeEvent } from "../RuntimeEvent";

/**
 * Event indicating a conversation turn has started.
 * Converted from ConversationStartStateEvent (Domain Event).
 */
export interface ConversationStartEvent
  extends RuntimeEvent<"conversation_start", ConversationStartEventData> {}

export interface ConversationStartEventData {
  /** The agent processing this conversation */
  readonly agentId: string;
}
