import type { RuntimeEvent } from "../RuntimeEvent";

/**
 * Event indicating a tool execution has been planned.
 * Converted from ToolPlannedStateEvent (Domain Event).
 */
export interface ToolPlannedEnvEvent
  extends RuntimeEvent<"tool_planned", ToolPlannedEnvEventData> {}

export interface ToolPlannedEnvEventData {
  /** The agent planning the tool call */
  readonly agentId: string;

  /** Tool call ID */
  readonly toolId: string;

  /** Tool name */
  readonly toolName: string;
}
