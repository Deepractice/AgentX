/**
 * Agent Events - Events from Agent domain (stream/state/message/turn)
 *
 * Agent events for the EventBus system.
 */

import type {
  UserMessage,
  AssistantMessage,
  ToolCallMessage,
  ToolResultMessage,
  ErrorMessage,
} from "../../agent/types";
import type { SystemEvent, EventContext } from "./base";
import type { StopReason } from "./driver";

// ============================================================================
// Agent Event Categories and Base Types
// ============================================================================

/**
 * Agent event categories
 */
export type AgentEventCategory = "stream" | "state" | "message" | "turn";

/**
 * BaseAgentEvent - Base interface for all Agent events
 *
 * Extends SystemEvent with fixed source and intent.
 */
export interface BaseAgentEvent<
  T extends string,
  D,
  C extends AgentEventCategory,
> extends SystemEvent<T, D, "agent", C, "notification"> {
  /**
   * Runtime context (optional, added by Presenter)
   */
  readonly context?: EventContext;
}

// ============================================================================
// Agent Stream Events
// ============================================================================

/**
 * Base type for agent stream events
 */
export interface AgentStreamEventBase<T extends string, D> extends BaseAgentEvent<T, D, "stream"> {}

// Re-export StopReason for convenience (as AgentStopReason to avoid conflict)
export type AgentStopReason = StopReason;

/**
 * AgentMessageStartEvent - Streaming message begins
 */
export interface AgentMessageStartEvent extends AgentStreamEventBase<
  "message_start",
  {
    messageId: string;
    model: string;
  }
> {}

/**
 * AgentMessageDeltaEvent - Message-level updates (usage info)
 */
export interface AgentMessageDeltaEvent extends AgentStreamEventBase<
  "message_delta",
  {
    usage?: {
      inputTokens: number;
      outputTokens: number;
    };
  }
> {}

/**
 * AgentMessageStopEvent - Streaming message completes
 */
export interface AgentMessageStopEvent extends AgentStreamEventBase<
  "message_stop",
  {
    stopReason?: StopReason;
  }
> {}

/**
 * AgentTextDeltaEvent - Incremental text output
 */
export interface AgentTextDeltaEvent extends AgentStreamEventBase<
  "text_delta",
  {
    text: string;
  }
> {}

/**
 * AgentToolUseStartEvent - Tool use block started
 */
export interface AgentToolUseStartEvent extends AgentStreamEventBase<
  "tool_use_start",
  {
    toolCallId: string;
    toolName: string;
  }
> {}

/**
 * AgentInputJsonDeltaEvent - Incremental tool input JSON
 */
export interface AgentInputJsonDeltaEvent extends AgentStreamEventBase<
  "input_json_delta",
  {
    partialJson: string;
  }
> {}

/**
 * AgentToolUseStopEvent - Tool use block completed
 */
export interface AgentToolUseStopEvent extends AgentStreamEventBase<
  "tool_use_stop",
  {
    toolCallId: string;
    toolName: string;
    input: Record<string, unknown>;
  }
> {}

/**
 * AgentToolResultEvent - Tool execution result
 */
export interface AgentToolResultEvent extends AgentStreamEventBase<
  "tool_result",
  {
    toolCallId: string;
    result: unknown;
    isError?: boolean;
  }
> {}

/**
 * AgentErrorReceivedEvent - Error received from environment
 *
 * Processed by MealyMachine to produce:
 * - error_occurred (StateEvent)
 * - error_message (MessageEvent)
 */
export interface AgentErrorReceivedEvent extends AgentStreamEventBase<
  "error_received",
  {
    /** Error message (human-readable) */
    message: string;
    /** Error code (e.g., "rate_limit_error", "api_error") */
    errorCode?: string;
  }
> {}

/**
 * AgentStreamEvent - All stream events
 */
export type AgentStreamEvent =
  | AgentMessageStartEvent
  | AgentMessageDeltaEvent
  | AgentMessageStopEvent
  | AgentTextDeltaEvent
  | AgentToolUseStartEvent
  | AgentInputJsonDeltaEvent
  | AgentToolUseStopEvent
  | AgentToolResultEvent
  | AgentErrorReceivedEvent;

/**
 * AgentStreamEventType - String literal union
 */
export type AgentStreamEventType = AgentStreamEvent["type"];

/**
 * Type guard: is this a stream event?
 */
export function isAgentStreamEvent(event: {
  source?: string;
  category?: string;
}): event is AgentStreamEvent {
  return event.source === "agent" && event.category === "stream";
}

// ============================================================================
// Agent State Events
// ============================================================================

/**
 * Base type for state events
 */
export interface AgentStateEventBase<T extends string, D> extends BaseAgentEvent<T, D, "state"> {}

// Conversation Events
/**
 * ConversationQueuedEvent - Message queued for processing
 */
export interface ConversationQueuedEvent extends AgentStateEventBase<
  "conversation_queued",
  {
    messageId: string;
  }
> {}

/**
 * ConversationStartEvent - Conversation started
 */
export interface ConversationStartEvent extends AgentStateEventBase<
  "conversation_start",
  {
    messageId: string;
  }
> {}

/**
 * ConversationThinkingEvent - Agent is thinking
 */
export interface ConversationThinkingEvent extends AgentStateEventBase<
  "conversation_thinking",
  Record<string, never>
> {}

/**
 * ConversationRespondingEvent - Agent is responding
 */
export interface ConversationRespondingEvent extends AgentStateEventBase<
  "conversation_responding",
  Record<string, never>
> {}

/**
 * ConversationEndEvent - Conversation ended
 */
export interface ConversationEndEvent extends AgentStateEventBase<
  "conversation_end",
  {
    reason: "completed" | "interrupted" | "error";
  }
> {}

/**
 * ConversationInterruptedEvent - Conversation interrupted
 */
export interface ConversationInterruptedEvent extends AgentStateEventBase<
  "conversation_interrupted",
  {
    reason: string;
  }
> {}

// Tool Events
/**
 * ToolPlannedEvent - Tool use planned
 */
export interface ToolPlannedEvent extends AgentStateEventBase<
  "tool_planned",
  {
    toolId: string;
    toolName: string;
  }
> {}

/**
 * ToolExecutingEvent - Tool is executing
 */
export interface ToolExecutingEvent extends AgentStateEventBase<
  "tool_executing",
  {
    toolId: string;
    toolName: string;
    input: Record<string, unknown>;
  }
> {}

/**
 * ToolCompletedEvent - Tool execution completed
 */
export interface ToolCompletedEvent extends AgentStateEventBase<
  "tool_completed",
  {
    toolId: string;
    toolName: string;
    result: unknown;
  }
> {}

/**
 * ToolFailedEvent - Tool execution failed
 */
export interface ToolFailedEvent extends AgentStateEventBase<
  "tool_failed",
  {
    toolId: string;
    toolName: string;
    error: string;
  }
> {}

// Error Events (State)
/**
 * ErrorOccurredEvent - Error occurred during processing
 */
export interface ErrorOccurredEvent extends AgentStateEventBase<
  "error_occurred",
  {
    code: string;
    message: string;
    recoverable: boolean;
    category?: string;
  }
> {}

/**
 * AgentStateEvent - All state events
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
 * AgentStateEventType - String literal union
 */
export type AgentStateEventType = AgentStateEvent["type"];

/**
 * Type guard: is this a state event?
 */
export function isAgentStateEvent(event: {
  source?: string;
  category?: string;
}): event is AgentStateEvent {
  return event.source === "agent" && event.category === "state";
}

// ============================================================================
// Agent Message Events
// ============================================================================

/**
 * Base type for message events
 */
export interface AgentMessageEventBase<T extends string, D> extends BaseAgentEvent<
  T,
  D,
  "message"
> {}

/**
 * UserMessageEvent - User sent a message
 * Data: Complete UserMessage object
 */
export interface UserMessageEvent extends AgentMessageEventBase<"user_message", UserMessage> {}

/**
 * AssistantMessageEvent - Assistant response message
 * Data: Complete AssistantMessage object
 */
export interface AssistantMessageEvent extends AgentMessageEventBase<
  "assistant_message",
  AssistantMessage
> {}

/**
 * ToolCallMessageEvent - Tool call message (part of assistant turn)
 * Data: Complete ToolCallMessage object
 */
export interface ToolCallMessageEvent extends AgentMessageEventBase<
  "tool_call_message",
  ToolCallMessage
> {}

/**
 * ToolResultMessageEvent - Tool result message
 * Data: Complete ToolResultMessage object
 */
export interface ToolResultMessageEvent extends AgentMessageEventBase<
  "tool_result_message",
  ToolResultMessage
> {}

/**
 * ErrorMessageEvent - Error message displayed in chat
 * Data: Complete ErrorMessage object
 *
 * Generated when error_received StreamEvent is processed by MealyMachine.
 * Displayed in the chat history so users can see what went wrong.
 */
export interface ErrorMessageEvent extends AgentMessageEventBase<"error_message", ErrorMessage> {}

/**
 * AgentMessageEvent - All message events
 */
export type AgentMessageEvent =
  | UserMessageEvent
  | AssistantMessageEvent
  | ToolCallMessageEvent
  | ToolResultMessageEvent
  | ErrorMessageEvent;

/**
 * AgentMessageEventType - String literal union
 */
export type AgentMessageEventType = AgentMessageEvent["type"];

/**
 * Type guard: is this a message event?
 */
export function isAgentMessageEvent(event: {
  source?: string;
  category?: string;
}): event is AgentMessageEvent {
  return event.source === "agent" && event.category === "message";
}

// ============================================================================
// Agent Turn Events
// ============================================================================

/**
 * Base type for turn events
 */
export interface AgentTurnEventBase<T extends string, D> extends BaseAgentEvent<T, D, "turn"> {}

/**
 * Token usage information
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens?: number;
}

/**
 * TurnRequestEvent - Turn started (user message received)
 */
export interface TurnRequestEvent extends AgentTurnEventBase<
  "turn_request",
  {
    turnId: string;
    messageId: string;
    content: string;
    timestamp: number;
  }
> {}

/**
 * TurnResponseEvent - Turn completed (assistant response finished)
 */
export interface TurnResponseEvent extends AgentTurnEventBase<
  "turn_response",
  {
    turnId: string;
    messageId: string;
    duration: number;
    usage?: TokenUsage;
    model?: string;
    stopReason?: string;
    timestamp: number;
  }
> {}

/**
 * AgentTurnEvent - All turn events
 */
export type AgentTurnEvent = TurnRequestEvent | TurnResponseEvent;

/**
 * AgentTurnEventType - String literal union
 */
export type AgentTurnEventType = AgentTurnEvent["type"];

/**
 * Type guard: is this a turn event?
 */
export function isAgentTurnEvent(event: {
  source?: string;
  category?: string;
}): event is AgentTurnEvent {
  return event.source === "agent" && event.category === "turn";
}

// ============================================================================
// Agent Event Union
// ============================================================================

/**
 * AgentEvent - All events from Agent domain
 */
export type AgentEvent = AgentStreamEvent | AgentStateEvent | AgentMessageEvent | AgentTurnEvent;

/**
 * Type guard: is this an agent event?
 */
export function isAgentEvent(event: { source?: string }): event is AgentEvent {
  return event.source === "agent";
}
