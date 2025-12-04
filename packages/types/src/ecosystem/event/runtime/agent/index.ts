/**
 * Agent Events
 *
 * All events related to Agent operations:
 * - StreamEvent: Real-time streaming output
 * - StateEvent: State transitions
 * - MessageEvent: Complete messages
 * - TurnEvent: Conversation turns
 * - ErrorEvent: Errors
 */

// Stream Events
export type { StreamEvent, AgentStreamEvent, StreamEventContext } from "./stream";
export { toAgentStreamEvent } from "./stream";

// State Events
export type {
  StateEvent,
  AgentStateEvent,
  // Lifecycle
  AgentInitializingEvent,
  AgentReadyEvent,
  AgentDestroyedEvent,
  // Conversation
  ConversationQueuedEvent,
  ConversationStartEvent,
  ConversationThinkingEvent,
  ConversationRespondingEvent,
  ConversationEndEvent,
  ConversationInterruptedEvent,
  // Tool
  ToolPlannedEvent,
  ToolExecutingEvent,
  ToolCompletedEvent,
  ToolFailedEvent,
  // Error
  ErrorOccurredEvent,
} from "./state";

// Message Events
export type {
  MessageEvent,
  AgentMessageEvent,
  UserMessageEvent,
  AssistantMessageEvent,
  ToolCallMessageEvent,
  ToolResultMessageEvent,
} from "./message";

// Turn Events
export type {
  TurnEvent,
  AgentTurnEvent,
  TurnRequestEvent,
  TurnResponseEvent,
} from "./turn";

// Error Events
export type {
  AgentErrorEvent,
  AllAgentErrorEvent,
  AgentErrorOccurredEvent,
} from "./error";

// ============================================================================
// Combined Union
// ============================================================================

import type { AgentStreamEvent } from "./stream";
import type { AgentStateEvent } from "./state";
import type { AgentMessageEvent } from "./message";
import type { AgentTurnEvent } from "./turn";
import type { AllAgentErrorEvent } from "./error";

/**
 * AgentEvent - All agent events
 */
export type AgentEvent =
  | AgentStreamEvent
  | AgentStateEvent
  | AgentMessageEvent
  | AgentTurnEvent
  | AllAgentErrorEvent;

/**
 * AgentEventType - String literal union of all agent event types
 */
export type AgentEventType = AgentEvent["type"];
