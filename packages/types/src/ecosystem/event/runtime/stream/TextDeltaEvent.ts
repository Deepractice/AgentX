import type { RuntimeEvent } from "../RuntimeEvent";

/**
 * Event containing incremental text output from the agent.
 * Converted from TextDeltaEvent (Domain Event).
 */
export interface TextDeltaEnvEvent extends RuntimeEvent<"text_delta", TextDeltaEnvEventData> {}

export interface TextDeltaEnvEventData {
  /** The agent producing this text */
  readonly agentId: string;

  /** Incremental text content */
  readonly text: string;
}
