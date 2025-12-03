import type { RuntimeEvent } from "../RuntimeEvent";

/**
 * SSE heartbeat event for connection keepalive.
 */
export interface HeartbeatEvent extends RuntimeEvent<"heartbeat", HeartbeatEventData> {}

export interface HeartbeatEventData {
  /** Server timestamp when heartbeat was sent */
  readonly serverTime: number;
}
