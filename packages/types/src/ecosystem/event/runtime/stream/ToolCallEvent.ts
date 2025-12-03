import type { RuntimeEvent } from "../RuntimeEvent";

/**
 * Event indicating a tool call has been requested.
 * Converted from ToolCallEvent (Domain Event).
 */
export interface ToolCallEnvEvent extends RuntimeEvent<"tool_call", ToolCallEnvEventData> {}

export interface ToolCallEnvEventData {
  /** The agent making the tool call */
  readonly agentId: string;

  /** Tool call ID */
  readonly id: string;

  /** Tool name */
  readonly name: string;

  /** Tool input arguments */
  readonly input: unknown;
}
