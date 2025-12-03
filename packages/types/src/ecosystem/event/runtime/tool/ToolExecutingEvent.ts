import type { RuntimeEvent } from "../RuntimeEvent";

/**
 * Event indicating a tool is being executed.
 * Converted from ToolExecutingStateEvent (Domain Event).
 */
export interface ToolExecutingEnvEvent
  extends RuntimeEvent<"tool_executing", ToolExecutingEnvEventData> {}

export interface ToolExecutingEnvEventData {
  /** The agent executing the tool */
  readonly agentId: string;

  /** Tool call ID */
  readonly toolId: string;

  /** Tool name */
  readonly toolName: string;
}
