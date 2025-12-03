import type { RuntimeEvent } from "../RuntimeEvent";

/**
 * Event indicating a new message stream has started.
 * Converted from MessageStartEvent (Domain Event).
 */
export interface MessageStartEnvEvent
  extends RuntimeEvent<"message_start", MessageStartEnvEventData> {}

export interface MessageStartEnvEventData {
  /** The agent producing this message */
  readonly agentId: string;

  /** Message ID */
  readonly messageId: string;

  /** Message role */
  readonly role: "assistant";
}
