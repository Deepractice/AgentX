/**
 * Environment Events - External world events (LLM API, Network)
 *
 * DriveableEvent, ConnectionEvent, StopReason, ErrorEvent
 */

import type { SystemEvent } from "./base";

// ============================================================================
// Stop Reason
// ============================================================================

/**
 * Reason why the LLM stopped generating
 *
 * Based on common stop reasons across multiple LLM providers:
 * - Anthropic Claude: end_turn, max_tokens, tool_use, stop_sequence
 * - OpenAI: stop, length, tool_calls, content_filter
 * - Vercel AI SDK: stop, length, tool-calls, content-filter, error, other
 */
export type StopReason =
  /**
   * Natural completion - model decided to stop
   */
  | "end_turn"

  /**
   * Reached maximum token limit
   */
  | "max_tokens"

  /**
   * Model requested tool usage
   */
  | "tool_use"

  /**
   * Encountered a custom stop sequence
   */
  | "stop_sequence"

  /**
   * Content filter triggered
   */
  | "content_filter"

  /**
   * Error occurred during generation
   */
  | "error"

  /**
   * Other/unknown reason
   */
  | "other";

/**
 * Type guard to check if a string is a valid StopReason
 */
export function isStopReason(value: string): value is StopReason {
  return [
    "end_turn",
    "max_tokens",
    "tool_use",
    "stop_sequence",
    "content_filter",
    "error",
    "other",
  ].includes(value);
}

// ============================================================================
// Driveable Events (LLM Stream Events)
// ============================================================================

/**
 * Base interface for all LLM stream events (DriveableEvent)
 *
 * All DriveableEvents have:
 * - source: "driver" (from LLM Driver)
 * - category: "stream" (streaming output)
 * - intent: "notification" (informational, no action needed)
 * - requestId: correlation with the original request
 * - context: agent/image/session scope (inherited from SystemEvent)
 */
interface BaseStreamEvent<T extends string, D = unknown> extends SystemEvent<
  T,
  D,
  "driver",
  "stream",
  "notification"
> {
  /**
   * Content block index (for multi-block responses)
   */
  index?: number;

  /**
   * Request ID for correlating events with the original message_send_request
   */
  requestId?: string;
}

// Message Lifecycle Events
/**
 * MessageStartEvent - Emitted when streaming message begins
 */
export interface MessageStartEvent extends BaseStreamEvent<
  "message_start",
  {
    message: {
      id: string;
      model: string;
    };
  }
> {}

/**
 * MessageDeltaEvent - Emitted with message-level updates
 */
export interface MessageDeltaEvent extends BaseStreamEvent<
  "message_delta",
  {
    usage?: {
      inputTokens: number;
      outputTokens: number;
    };
  }
> {}

/**
 * MessageStopEvent - Emitted when streaming message completes
 */
export interface MessageStopEvent extends BaseStreamEvent<
  "message_stop",
  {
    stopReason?: StopReason;
    stopSequence?: string;
  }
> {}

// Text Content Block Events
/**
 * TextContentBlockStartEvent - Text block started
 */
export interface TextContentBlockStartEvent extends BaseStreamEvent<
  "text_content_block_start",
  Record<string, never>
> {
  index: number;
}

/**
 * TextDeltaEvent - Incremental text output
 */
export interface TextDeltaEvent extends BaseStreamEvent<
  "text_delta",
  {
    text: string;
  }
> {}

/**
 * TextContentBlockStopEvent - Text block completed
 */
export interface TextContentBlockStopEvent extends BaseStreamEvent<
  "text_content_block_stop",
  Record<string, never>
> {
  index: number;
}

// Tool Use Content Block Events
/**
 * ToolUseContentBlockStartEvent - Tool use block started
 */
export interface ToolUseContentBlockStartEvent extends BaseStreamEvent<
  "tool_use_content_block_start",
  {
    id: string;
    name: string;
  }
> {
  index: number;
}

/**
 * InputJsonDeltaEvent - Incremental tool input JSON
 */
export interface InputJsonDeltaEvent extends BaseStreamEvent<
  "input_json_delta",
  {
    partialJson: string;
  }
> {
  index: number;
}

/**
 * ToolUseContentBlockStopEvent - Tool use block completed
 */
export interface ToolUseContentBlockStopEvent extends BaseStreamEvent<
  "tool_use_content_block_stop",
  Record<string, never>
> {
  index: number;
}

// Tool Execution Events
/**
 * ToolCallEvent - Tool call ready for execution
 */
export interface ToolCallEvent extends BaseStreamEvent<
  "tool_call",
  {
    id: string;
    name: string;
    input: Record<string, unknown>;
  }
> {}

/**
 * ToolResultEvent - Tool execution result
 */
export interface ToolResultEvent extends BaseStreamEvent<
  "tool_result",
  {
    toolUseId: string;
    result: unknown;
    isError?: boolean;
  }
> {}

// Interrupt Event
/**
 * InterruptedEvent - Stream interrupted
 */
export interface InterruptedEvent extends BaseStreamEvent<
  "interrupted",
  {
    reason: "user_interrupt" | "timeout" | "error" | "system";
  }
> {}

// Error Event (Environment)
/**
 * ErrorReceivedEvent - Error received from environment (e.g., Claude API error)
 *
 * This event drives the MealyMachine to produce:
 * - error_occurred (StateEvent) -> state transitions to "error"
 * - error_message (MessageEvent) -> displayed in chat
 */
export interface ErrorReceivedEvent extends BaseStreamEvent<
  "error_received",
  {
    /** Error message (human-readable) */
    message: string;
    /** Error code (e.g., "rate_limit_error", "api_error", "overloaded_error") */
    errorCode?: string;
  }
> {}

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
  | InterruptedEvent
  // Error
  | ErrorReceivedEvent;

/**
 * DriveableEventType - String literal union of all driveable event types
 */
export type DriveableEventType = DriveableEvent["type"];

/**
 * Type guard: is this a DriveableEvent?
 */
export function isDriveableEvent(event: {
  source?: string;
  category?: string;
}): event is DriveableEvent {
  return event.source === "driver" && event.category === "stream";
}

// ============================================================================
// Connection Events (Network Status)
// ============================================================================

/**
 * Base interface for all connection events
 */
interface BaseConnectionEvent<T extends string, D = unknown> extends SystemEvent<
  T,
  D,
  "driver",
  "connection",
  "notification"
> {}

/**
 * ConnectedEvent - Connection established
 */
export interface ConnectedEvent extends BaseConnectionEvent<
  "connected",
  {
    url?: string;
    reconnectAttempt?: number;
  }
> {}

/**
 * DisconnectedEvent - Connection lost
 */
export interface DisconnectedEvent extends BaseConnectionEvent<
  "disconnected",
  {
    reason?: string;
    code?: number;
    willReconnect?: boolean;
  }
> {}

/**
 * ReconnectingEvent - Attempting to reconnect
 */
export interface ReconnectingEvent extends BaseConnectionEvent<
  "reconnecting",
  {
    attempt: number;
    maxAttempts?: number;
    delayMs: number;
  }
> {}

/**
 * ConnectionEvent - All network status events
 */
export type ConnectionEvent = ConnectedEvent | DisconnectedEvent | ReconnectingEvent;

/**
 * ConnectionEventType - String literal union
 */
export type ConnectionEventType = ConnectionEvent["type"];

/**
 * Type guard: is this a ConnectionEvent?
 */
export function isConnectionEvent(event: {
  source?: string;
  category?: string;
}): event is ConnectionEvent {
  return event.source === "driver" && event.category === "connection";
}

/**
 * EnvironmentEvent - Union of all environment events
 */
export type EnvironmentEvent = DriveableEvent | ConnectionEvent;

// ============================================================================
// Error Events (System-wide error notifications)
// ============================================================================

/**
 * SystemError - Generic error event
 *
 * Used for all errors until we create specific error types.
 * Can originate from any source (runtime, agent, container, etc.)
 *
 * @example
 * ```typescript
 * const error: SystemError = {
 *   type: "system_error",
 *   timestamp: Date.now(),
 *   source: "container",
 *   category: "error",
 *   intent: "notification",
 *   data: {
 *     message: "Container not found: default",
 *     requestId: "req_123",
 *     severity: "error",
 *   },
 *   context: { containerId: "default" }
 * };
 * ```
 */
export interface SystemError extends SystemEvent<
  "system_error",
  {
    /**
     * Error message (human-readable)
     */
    message: string;

    /**
     * Associated request ID (if error is related to a request)
     */
    requestId?: string;

    /**
     * Error severity
     * - info: Informational, no action needed
     * - warn: Warning, operation succeeded but with issues
     * - error: Error, operation failed
     * - fatal: Fatal error, system unstable
     */
    severity?: "info" | "warn" | "error" | "fatal";

    /**
     * Additional error details (stack trace, error code, etc.)
     */
    details?: unknown;
  },
  "agent" | "container" | "driver" | "session" | "sandbox" | "command",
  "error",
  "notification"
> {}

/**
 * Error event map - will grow as we add specific error types
 */
export interface ErrorEventMap {
  system_error: SystemError;
  // Future: container_not_found_error, agent_creation_error, llm_api_error, etc.
}

/**
 * Error event types
 */
export type ErrorEventType = keyof ErrorEventMap;

/**
 * Union of all error events
 */
export type ErrorEvent = ErrorEventMap[ErrorEventType];
