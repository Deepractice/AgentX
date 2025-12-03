import type { RuntimeEvent } from "../RuntimeEvent";

/**
 * Event containing the result of a tool execution.
 * Converted from ToolResultEvent (Domain Event).
 */
export interface ToolResultEnvEvent extends RuntimeEvent<"tool_result", ToolResultEnvEventData> {}

export interface ToolResultEnvEventData {
  /** The agent that requested the tool */
  readonly agentId: string;

  /** Tool call ID this result corresponds to */
  readonly toolId: string;

  /** Tool result content */
  readonly content: string | unknown[];

  /** Whether this is an error result */
  readonly isError?: boolean;
}
