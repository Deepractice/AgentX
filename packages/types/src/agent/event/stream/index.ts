/**
 * Agent Stream Events
 *
 * Real-time streaming events produced by AgentDriver.
 *
 * Flow:
 * ```
 * Driver → StreamEvent
 *              ↓
 *          Agent/Engine
 *              ↓
 *          Presenter
 * ```
 */

import type { AgentEvent } from "../AgentEvent";

/**
 * Stop reason for message completion
 */
export type StopReason = "end_turn" | "max_tokens" | "stop_sequence" | "tool_use";

// ============================================================================
// Message Lifecycle Events
// ============================================================================

/**
 * MessageStartEvent - Emitted when streaming message begins
 */
export interface MessageStartEvent extends AgentEvent<"message_start"> {
  data: {
    messageId: string;
    model: string;
  };
}

/**
 * MessageDeltaEvent - Emitted with message-level updates
 */
export interface MessageDeltaEvent extends AgentEvent<"message_delta"> {
  data: {
    usage?: {
      inputTokens: number;
      outputTokens: number;
    };
  };
}

/**
 * MessageStopEvent - Emitted when streaming message completes
 */
export interface MessageStopEvent extends AgentEvent<"message_stop"> {
  data: {
    stopReason?: StopReason;
  };
}

// ============================================================================
// Text Content Events
// ============================================================================

/**
 * TextDeltaEvent - Incremental text output
 */
export interface TextDeltaEvent extends AgentEvent<"text_delta"> {
  data: {
    text: string;
  };
}

// ============================================================================
// Tool Use Events
// ============================================================================

/**
 * ToolUseStartEvent - Tool use block started
 */
export interface ToolUseStartEvent extends AgentEvent<"tool_use_start"> {
  data: {
    toolCallId: string;
    toolName: string;
  };
}

/**
 * InputJsonDeltaEvent - Incremental tool input JSON
 */
export interface InputJsonDeltaEvent extends AgentEvent<"input_json_delta"> {
  data: {
    partialJson: string;
  };
}

/**
 * ToolUseStopEvent - Tool use block completed, ready for execution
 */
export interface ToolUseStopEvent extends AgentEvent<"tool_use_stop"> {
  data: {
    toolCallId: string;
    toolName: string;
    input: Record<string, unknown>;
  };
}

/**
 * ToolResultEvent - Tool execution result
 */
export interface ToolResultEvent extends AgentEvent<"tool_result"> {
  data: {
    toolCallId: string;
    result: unknown;
    isError?: boolean;
  };
}

// ============================================================================
// Union Type
// ============================================================================

/**
 * StreamEvent - All stream events produced by AgentDriver
 */
export type StreamEvent =
  // Message lifecycle
  | MessageStartEvent
  | MessageDeltaEvent
  | MessageStopEvent
  // Text content
  | TextDeltaEvent
  // Tool use
  | ToolUseStartEvent
  | InputJsonDeltaEvent
  | ToolUseStopEvent
  | ToolResultEvent;

/**
 * StreamEventType - String literal union of all stream event types
 */
export type StreamEventType = StreamEvent["type"];
