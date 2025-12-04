/**
 * DriveableEvent - Events that can drive Agent through Mealy Machine
 *
 * These events are:
 * 1. Output by Receptor (with turnId)
 * 2. Filtered by Driver (using turnId)
 * 3. Transformed by Driver into AgentStreamEvent (adding agentId)
 * 4. Processed by Engine
 *
 * Relationship: DriveableEvent ⊂ EnvironmentEvent
 *
 * Type Hierarchy:
 * ```
 * EnvironmentEvent (has turnId)
 * ├── DriveableEvent ← Receptor outputs this
 * │   ├── MessageStartEvent
 * │   ├── TextDeltaEvent
 * │   ├── ToolCallEvent
 * │   └── ...
 * └── ConnectionEvent (network status only)
 * ```
 *
 * Key Design:
 * - All DriveableEvents have turnId for correlation
 * - Receptor is stateless, outputs events to SystemBus
 * - Driver filters events by turnId and adds agentId
 */

import type { BaseEnvironmentEvent } from "./EnvironmentEvent";
import type { StopReason } from "~/ecosystem/runtime/container/llm/StopReason";

// ============================================================================
// Message Lifecycle Events
// ============================================================================

/**
 * MessageStartEvent - Emitted when streaming message begins
 */
export interface MessageStartEvent extends BaseEnvironmentEvent<"message_start"> {
  data: {
    message: {
      id: string;
      model: string;
    };
  };
  index?: number;
}

/**
 * MessageDeltaEvent - Emitted with message-level updates
 */
export interface MessageDeltaEvent extends BaseEnvironmentEvent<"message_delta"> {
  data: {
    usage?: {
      inputTokens: number;
      outputTokens: number;
    };
  };
  index?: number;
}

/**
 * MessageStopEvent - Emitted when streaming message completes
 */
export interface MessageStopEvent extends BaseEnvironmentEvent<"message_stop"> {
  data: {
    stopReason?: StopReason;
    stopSequence?: string;
  };
  index?: number;
}

// ============================================================================
// Text Content Block Events
// ============================================================================

/**
 * TextContentBlockStartEvent - Text block started
 */
export interface TextContentBlockStartEvent extends BaseEnvironmentEvent<"text_content_block_start"> {
  data: Record<string, never>;
  index: number;
}

/**
 * TextDeltaEvent - Incremental text output
 */
export interface TextDeltaEvent extends BaseEnvironmentEvent<"text_delta"> {
  data: {
    text: string;
  };
  index?: number;
}

/**
 * TextContentBlockStopEvent - Text block completed
 */
export interface TextContentBlockStopEvent extends BaseEnvironmentEvent<"text_content_block_stop"> {
  data: Record<string, never>;
  index: number;
}

// ============================================================================
// Tool Use Content Block Events
// ============================================================================

/**
 * ToolUseContentBlockStartEvent - Tool use block started
 */
export interface ToolUseContentBlockStartEvent extends BaseEnvironmentEvent<"tool_use_content_block_start"> {
  data: {
    id: string;
    name: string;
  };
  index: number;
}

/**
 * InputJsonDeltaEvent - Incremental tool input JSON
 */
export interface InputJsonDeltaEvent extends BaseEnvironmentEvent<"input_json_delta"> {
  data: {
    partialJson: string;
  };
  index: number;
}

/**
 * ToolUseContentBlockStopEvent - Tool use block completed
 */
export interface ToolUseContentBlockStopEvent extends BaseEnvironmentEvent<"tool_use_content_block_stop"> {
  data: Record<string, never>;
  index: number;
}

// ============================================================================
// Tool Execution Events
// ============================================================================

/**
 * ToolCallEvent - Tool call ready for execution
 */
export interface ToolCallEvent extends BaseEnvironmentEvent<"tool_call"> {
  data: {
    id: string;
    name: string;
    input: Record<string, unknown>;
  };
  index?: number;
}

/**
 * ToolResultEvent - Tool execution result
 */
export interface ToolResultEvent extends BaseEnvironmentEvent<"tool_result"> {
  data: {
    toolUseId: string;
    result: unknown;
    isError?: boolean;
  };
  index?: number;
}

// ============================================================================
// Interrupt Event
// ============================================================================

/**
 * InterruptedEvent - Stream interrupted
 */
export interface InterruptedEvent extends BaseEnvironmentEvent<"interrupted"> {
  data: {
    reason: "user_interrupt" | "timeout" | "error" | "system";
  };
  index?: number;
}

// ============================================================================
// Union Type
// ============================================================================

/**
 * DriveableEvent - All events that can drive Agent
 */
export type DriveableEvent =
  // Message lifecycle
  | MessageStartEvent
  | MessageDeltaEvent
  | MessageStopEvent
  // Text content block
  | TextContentBlockStartEvent
  | TextDeltaEvent
  | TextContentBlockStopEvent
  // Tool use content block
  | ToolUseContentBlockStartEvent
  | InputJsonDeltaEvent
  | ToolUseContentBlockStopEvent
  // Tool execution
  | ToolCallEvent
  | ToolResultEvent
  // Interrupt
  | InterruptedEvent;

/**
 * DriveableEventType - String literal union of all driveable event types
 */
export type DriveableEventType = DriveableEvent["type"];
