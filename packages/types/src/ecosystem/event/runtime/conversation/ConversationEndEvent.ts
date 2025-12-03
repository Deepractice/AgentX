import type { RuntimeEvent } from "../RuntimeEvent";

/**
 * Event indicating a conversation turn has ended normally.
 * Converted from ConversationEndStateEvent (Domain Event).
 */
export interface ConversationEndEvent
  extends RuntimeEvent<"conversation_end", ConversationEndEventData> {}

export interface ConversationEndEventData {
  /** The agent that completed the conversation */
  readonly agentId: string;
}
