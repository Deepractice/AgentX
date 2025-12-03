import type { RuntimeEvent } from "../RuntimeEvent";

/**
 * Event indicating an existing session has been resumed.
 */
export interface SessionResumedEvent
  extends RuntimeEvent<"session_resumed", SessionResumedEventData> {}

export interface SessionResumedEventData {
  /** The resumed session ID */
  readonly sessionId: string;

  /** Associated agent ID */
  readonly agentId: string;

  /** Number of messages in the session history */
  readonly messageCount: number;
}
