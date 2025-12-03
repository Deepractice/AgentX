import type { RuntimeEvent } from "../RuntimeEvent";

/**
 * Event indicating the stream was interrupted.
 * Converted from InterruptedStreamEvent (Domain Event).
 */
export interface InterruptedEnvEvent extends RuntimeEvent<"interrupted", InterruptedEnvEventData> {}

export interface InterruptedEnvEventData {
  /** The agent whose stream was interrupted */
  readonly agentId: string;

  /** Reason for interruption */
  readonly reason?: string;
}
