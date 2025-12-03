import type { RuntimeEvent } from "../RuntimeEvent";

/**
 * Event indicating the agent is responding/streaming output.
 * Converted from ConversationRespondingStateEvent (Domain Event).
 */
export interface ConversationRespondingEvent
  extends RuntimeEvent<"conversation_responding", ConversationRespondingEventData> {}

export interface ConversationRespondingEventData {
  /** The agent that is responding */
  readonly agentId: string;
}
