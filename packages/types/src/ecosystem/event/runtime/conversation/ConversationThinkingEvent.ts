import type { RuntimeEvent } from "../RuntimeEvent";

/**
 * Event indicating the agent is thinking/processing.
 * Converted from ConversationThinkingStateEvent (Domain Event).
 */
export interface ConversationThinkingEvent
  extends RuntimeEvent<"conversation_thinking", ConversationThinkingEventData> {}

export interface ConversationThinkingEventData {
  /** The agent that is thinking */
  readonly agentId: string;
}
