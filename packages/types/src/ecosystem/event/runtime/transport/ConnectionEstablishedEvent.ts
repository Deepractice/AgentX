import type { RuntimeEvent } from "../RuntimeEvent";

/**
 * Event indicating SSE connection has been established.
 */
export interface ConnectionEstablishedEvent
  extends RuntimeEvent<"connection_established", ConnectionEstablishedEventData> {}

export interface ConnectionEstablishedEventData {
  /** Connection ID assigned by server */
  readonly connectionId: string;
}
