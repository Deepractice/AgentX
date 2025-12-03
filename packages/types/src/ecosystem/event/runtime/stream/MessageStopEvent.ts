import type { RuntimeEvent } from "../RuntimeEvent";
import type { StopReason } from "~/ecosystem/runtime/container/sandbox/llm/StopReason";

/**
 * Event indicating a message stream has ended.
 * Converted from MessageStopEvent (Domain Event).
 */
export interface MessageStopEnvEvent
  extends RuntimeEvent<"message_stop", MessageStopEnvEventData> {}

export interface MessageStopEnvEventData {
  /** The agent that produced this message */
  readonly agentId: string;

  /** Reason the message stopped */
  readonly stopReason: StopReason;
}
