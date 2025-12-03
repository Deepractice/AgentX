import type { RuntimeEvent } from "../RuntimeEvent";

/**
 * Event indicating a new session has been created.
 */
export interface SessionCreatedEvent
  extends RuntimeEvent<"session_created", SessionCreatedEventData> {}

export interface SessionCreatedEventData {
  /** The newly created session ID */
  readonly sessionId: string;

  /** Associated agent ID */
  readonly agentId: string;
}
