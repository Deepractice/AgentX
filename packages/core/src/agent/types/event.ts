/**
 * Event Types - Stream, State, Message, and Turn Events
 *
 * This file defines all event types for the AgentEngine:
 * - Base EngineEvent type
 * - Stream Events: message_start, text_delta, tool_use_*, etc.
 * - State Events: conversation_*, tool_*, error_*
 * - Message Events: user_message, assistant_message, etc.
 * - Turn Events: turn_request, turn_response
 * - AgentOutput: Union of all output events
 *
 * @packageDocumentation
 */

import type {
  UserMessage,
  AssistantMessage,
  ToolCallMessage,
  ToolResultMessage,
  ErrorMessage,
  TokenUsage,
} from "./message";

// =============================================================================
// Base Types
// =============================================================================

/**
 * EngineEvent - Lightweight event base for AgentEngine domain
 *
 * EngineEvent is the simplified event structure used inside AgentEngine.
 * It only contains: type, timestamp, data
 *
 * This is a self-contained type without external dependencies.
 * All specific event types (StreamEvent, StateEvent, etc.) extend this base.
 */
export interface EngineEvent<T extends string = string, D = unknown> {
  /**
   * Event type identifier (e.g., "text_delta", "assistant_message")
   */
  readonly type: T;

  /**
   * Event timestamp (Unix milliseconds)
   */
  readonly timestamp: number;

  /**
   * Event payload data
   */
  readonly data: D;
}

/**
 * @deprecated Use EngineEvent instead
 */
export type AgentEvent<T extends string = string, D = unknown> = EngineEvent<T, D>;

// =============================================================================
// Agent State
// =============================================================================

/**
 * AgentState
 *
 * Agent conversation states for fine-grained monitoring.
 *
 * State transitions:
 * ```
 * idle -> thinking -> responding -> idle
 *                        |
 *               planning_tool -> awaiting_tool_result
 *                        |
 *                    thinking -> responding -> idle
 *
 * Any state can transition to error:
 * thinking/responding/planning_tool/awaiting_tool_result -> error -> idle
 * ```
 */
export type AgentState =
  | "idle" // Waiting for user input
  | "thinking" // LLM is thinking
  | "responding" // LLM is generating response
  | "planning_tool" // Generating tool call parameters
  | "awaiting_tool_result" // Waiting for tool execution result
  | "error"; // Error occurred during processing

// =============================================================================
// Agent Error
// =============================================================================

/**
 * Error category
 */
export type AgentErrorCategory =
  | "network" // Network/API errors
  | "validation" // Input validation errors
  | "system" // Internal system errors
  | "business"; // Business logic errors

/**
 * AgentError - Standardized error structure
 */
export interface AgentError {
  /**
   * Error category
   */
  category: AgentErrorCategory;

  /**
   * Error code (e.g., "NETWORK_TIMEOUT", "INVALID_INPUT")
   */
  code: string;

  /**
   * Human-readable error message
   */
  message: string;

  /**
   * Whether the error is recoverable
   */
  recoverable: boolean;

  /**
   * Original error (if any)
   */
  cause?: Error;

  /**
   * Additional context
   */
  context?: Record<string, unknown>;
}

// =============================================================================
// Stream Events
// =============================================================================

/**
 * Stop reason for message completion
 */
export type StopReason = "end_turn" | "max_tokens" | "stop_sequence" | "tool_use";

// --- Stream Event Data Types ---

export interface MessageStartData {
  messageId: string;
  model: string;
}

export interface MessageDeltaData {
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface MessageStopData {
  stopReason?: StopReason;
}

export interface TextDeltaData {
  text: string;
}

export interface ToolUseStartData {
  toolCallId: string;
  toolName: string;
}

export interface InputJsonDeltaData {
  partialJson: string;
}

export interface ToolUseStopData {
  toolCallId: string;
  toolName: string;
  input: Record<string, unknown>;
}

export interface ToolResultData {
  toolCallId: string;
  result: unknown;
  isError?: boolean;
}

export interface ErrorReceivedData {
  message: string;
  errorCode?: string;
}

// --- Stream Event Types ---

export type MessageStartEvent = EngineEvent<"message_start", MessageStartData>;
export type MessageDeltaEvent = EngineEvent<"message_delta", MessageDeltaData>;
export type MessageStopEvent = EngineEvent<"message_stop", MessageStopData>;
export type TextDeltaEvent = EngineEvent<"text_delta", TextDeltaData>;
export type ToolUseStartEvent = EngineEvent<"tool_use_start", ToolUseStartData>;
export type InputJsonDeltaEvent = EngineEvent<"input_json_delta", InputJsonDeltaData>;
export type ToolUseStopEvent = EngineEvent<"tool_use_stop", ToolUseStopData>;
export type ToolResultEvent = EngineEvent<"tool_result", ToolResultData>;
export type ErrorReceivedEvent = EngineEvent<"error_received", ErrorReceivedData>;

/**
 * StreamEvent - All lightweight stream events
 */
export type StreamEvent =
  | MessageStartEvent
  | MessageDeltaEvent
  | MessageStopEvent
  | TextDeltaEvent
  | ToolUseStartEvent
  | InputJsonDeltaEvent
  | ToolUseStopEvent
  | ToolResultEvent
  | ErrorReceivedEvent;

/**
 * StreamEventType - String literal union
 */
export type StreamEventType = StreamEvent["type"];

// =============================================================================
// State Events
// =============================================================================

// --- State Event Data Types ---

export interface ConversationQueuedData {
  messageId: string;
}

export interface ConversationStartData {
  messageId: string;
}

export interface ConversationThinkingData {
  // Empty
}

export interface ConversationRespondingData {
  // Empty
}

export interface ConversationEndData {
  reason: "completed" | "interrupted" | "error";
}

export interface ConversationInterruptedData {
  reason: string;
}

export interface ToolPlannedData {
  toolId: string;
  toolName: string;
}

export interface ToolExecutingData {
  toolId: string;
  toolName: string;
  input: Record<string, unknown>;
}

export interface ToolCompletedData {
  toolId: string;
  toolName: string;
  result: unknown;
}

export interface ToolFailedData {
  toolId: string;
  toolName: string;
  error: string;
}

export interface ErrorOccurredData {
  code: string;
  message: string;
  recoverable: boolean;
  category?: string;
}

/**
 * StateEvent - Base type for state events
 * @deprecated Use specific event types instead
 */
export interface StateEvent<T extends string = string, D = unknown> extends EngineEvent<T, D> {}

// --- State Event Types ---

export type ConversationQueuedEvent = EngineEvent<"conversation_queued", ConversationQueuedData>;
export type ConversationStartEvent = EngineEvent<"conversation_start", ConversationStartData>;
export type ConversationThinkingEvent = EngineEvent<"conversation_thinking", ConversationThinkingData>;
export type ConversationRespondingEvent = EngineEvent<"conversation_responding", ConversationRespondingData>;
export type ConversationEndEvent = EngineEvent<"conversation_end", ConversationEndData>;
export type ConversationInterruptedEvent = EngineEvent<"conversation_interrupted", ConversationInterruptedData>;
export type ToolPlannedEvent = EngineEvent<"tool_planned", ToolPlannedData>;
export type ToolExecutingEvent = EngineEvent<"tool_executing", ToolExecutingData>;
export type ToolCompletedEvent = EngineEvent<"tool_completed", ToolCompletedData>;
export type ToolFailedEvent = EngineEvent<"tool_failed", ToolFailedData>;
export type ErrorOccurredEvent = EngineEvent<"error_occurred", ErrorOccurredData>;

/**
 * Alias for ErrorOccurredEvent (legacy compatibility)
 */
export type AgentErrorOccurredEvent = ErrorOccurredEvent;

/**
 * AgentStateEvent - All lightweight state events
 */
export type AgentStateEvent =
  // Conversation
  | ConversationQueuedEvent
  | ConversationStartEvent
  | ConversationThinkingEvent
  | ConversationRespondingEvent
  | ConversationEndEvent
  | ConversationInterruptedEvent
  // Tool
  | ToolPlannedEvent
  | ToolExecutingEvent
  | ToolCompletedEvent
  | ToolFailedEvent
  // Error
  | ErrorOccurredEvent;

/**
 * Type guard: is this a state event?
 */
export function isStateEvent(event: EngineEvent): event is AgentStateEvent {
  const stateTypes = [
    "conversation_queued",
    "conversation_start",
    "conversation_thinking",
    "conversation_responding",
    "conversation_end",
    "conversation_interrupted",
    "tool_planned",
    "tool_executing",
    "tool_completed",
    "tool_failed",
    "error_occurred",
  ];
  return stateTypes.includes(event.type);
}

// =============================================================================
// Message Events
// =============================================================================

/**
 * MessageEvent - Base type for message events
 * @deprecated Use specific event types instead
 */
export interface MessageEvent<T extends string = string, D = unknown> extends EngineEvent<T, D> {}

// --- Message Event Types ---

export type UserMessageEvent = EngineEvent<"user_message", UserMessage>;
export type AssistantMessageEvent = EngineEvent<"assistant_message", AssistantMessage>;
export type ToolCallMessageEvent = EngineEvent<"tool_call_message", ToolCallMessage>;
export type ToolResultMessageEvent = EngineEvent<"tool_result_message", ToolResultMessage>;
export type ErrorMessageEvent = EngineEvent<"error_message", ErrorMessage>;

/**
 * AgentMessageEvent - All lightweight message events
 */
export type AgentMessageEvent =
  | UserMessageEvent
  | AssistantMessageEvent
  | ToolCallMessageEvent
  | ToolResultMessageEvent
  | ErrorMessageEvent;

/**
 * Type guard: is this a message event?
 */
export function isMessageEvent(event: EngineEvent): event is AgentMessageEvent {
  const messageTypes = [
    "user_message",
    "assistant_message",
    "tool_call_message",
    "tool_result_message",
    "error_message",
  ];
  return messageTypes.includes(event.type);
}

// =============================================================================
// Turn Events
// =============================================================================

// --- Turn Event Data Types ---

export interface TurnRequestData {
  turnId: string;
  messageId: string;
  content: string;
  timestamp: number;
}

export interface TurnResponseData {
  turnId: string;
  messageId: string;
  duration: number;
  usage?: TokenUsage;
  model?: string;
  stopReason?: string;
  timestamp: number;
}

/**
 * TurnEvent - Base type for turn events
 * @deprecated Use specific event types instead
 */
export interface TurnEvent<T extends string = string, D = unknown> extends EngineEvent<T, D> {}

// --- Turn Event Types ---

export type TurnRequestEvent = EngineEvent<"turn_request", TurnRequestData>;
export type TurnResponseEvent = EngineEvent<"turn_response", TurnResponseData>;

/**
 * AgentTurnEvent - All lightweight turn events
 */
export type AgentTurnEvent = TurnRequestEvent | TurnResponseEvent;

/**
 * Type guard: is this a turn event?
 */
export function isTurnEvent(event: EngineEvent): event is AgentTurnEvent {
  const turnTypes = ["turn_request", "turn_response"];
  return turnTypes.includes(event.type);
}

// =============================================================================
// Agent Output
// =============================================================================

/**
 * AgentOutput - Union of all possible agent output events
 *
 * Includes all event layers:
 * - Stream: Real-time streaming events from Driver
 * - State: State machine transitions
 * - Message: Assembled messages
 * - Turn: Turn analytics
 */
export type AgentOutput = StreamEvent | AgentStateEvent | AgentMessageEvent | AgentTurnEvent;

// =============================================================================
// Event Handling Types
// =============================================================================

/**
 * Unsubscribe function returned by on()
 */
export type Unsubscribe = () => void;

/**
 * Agent output event callback function type
 */
export type AgentOutputCallback<T extends AgentOutput = AgentOutput> = (event: T) => void;

/**
 * @deprecated Use AgentOutputCallback instead
 */
export type AgentEventHandler<T extends AgentOutput = AgentOutput> = AgentOutputCallback<T>;
