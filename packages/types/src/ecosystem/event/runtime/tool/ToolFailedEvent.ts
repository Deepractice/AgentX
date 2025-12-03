import type { RuntimeEvent } from "../RuntimeEvent";

/**
 * Event indicating a tool execution has failed.
 * Converted from ToolFailedStateEvent (Domain Event).
 */
export interface ToolFailedEnvEvent extends RuntimeEvent<"tool_failed", ToolFailedEnvEventData> {}

export interface ToolFailedEnvEventData {
  /** The agent that attempted the tool */
  readonly agentId: string;

  /** Tool call ID */
  readonly toolId: string;

  /** Tool name */
  readonly toolName: string;

  /** Error message */
  readonly error: string;
}
