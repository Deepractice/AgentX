import type { RuntimeEvent } from "../RuntimeEvent";

/**
 * Event indicating a tool execution has completed successfully.
 * Converted from ToolCompletedStateEvent (Domain Event).
 */
export interface ToolCompletedEnvEvent
  extends RuntimeEvent<"tool_completed", ToolCompletedEnvEventData> {}

export interface ToolCompletedEnvEventData {
  /** The agent that executed the tool */
  readonly agentId: string;

  /** Tool call ID */
  readonly toolId: string;

  /** Tool name */
  readonly toolName: string;
}
