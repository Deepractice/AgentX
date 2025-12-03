// ============================================================================
// Environment Events - External information that the system cares about
// ============================================================================

export * from "./environment";

// ============================================================================
// Runtime Events - System-level events with context (agentId, timestamp, etc.)
// ============================================================================

// Base runtime event type
export type { RuntimeEvent, RuntimeEventType } from "./runtime/RuntimeEvent";

// Transport events
export type {
  HeartbeatEvent,
  HeartbeatEventData,
  ConnectionEstablishedEvent,
  ConnectionEstablishedEventData,
} from "./runtime/transport";

// Session events
export type {
  SessionCreatedEvent,
  SessionCreatedEventData,
  SessionResumedEvent,
  SessionResumedEventData,
} from "./runtime/session";

// Agent lifecycle events
export type {
  AgentStartedEvent,
  AgentStartedEventData,
  AgentReadyEvent,
  AgentReadyEventData,
  AgentDestroyedEvent,
  AgentDestroyedEventData,
} from "./runtime/agent";

// Conversation events
export type {
  ConversationQueuedEvent,
  ConversationQueuedEventData,
  ConversationStartEvent,
  ConversationStartEventData,
  ConversationThinkingEvent,
  ConversationThinkingEventData,
  ConversationRespondingEvent,
  ConversationRespondingEventData,
  ConversationEndEvent,
  ConversationEndEventData,
  ConversationInterruptedEvent,
  ConversationInterruptedEventData,
} from "./runtime/conversation";

// Stream events
export type {
  MessageStartEnvEvent,
  MessageStartEnvEventData,
  MessageStopEnvEvent,
  MessageStopEnvEventData,
  TextDeltaEnvEvent,
  TextDeltaEnvEventData,
  ToolCallEnvEvent,
  ToolCallEnvEventData,
  ToolResultEnvEvent,
  ToolResultEnvEventData,
  InterruptedEnvEvent,
  InterruptedEnvEventData,
} from "./runtime/stream";

// Tool events
export type {
  ToolPlannedEnvEvent,
  ToolPlannedEnvEventData,
  ToolExecutingEnvEvent,
  ToolExecutingEnvEventData,
  ToolCompletedEnvEvent,
  ToolCompletedEnvEventData,
  ToolFailedEnvEvent,
  ToolFailedEnvEventData,
} from "./runtime/tool";

// Error events
export type { ErrorEnvEvent, ErrorEnvEventData } from "./runtime/error";

// Union type of all Runtime Events
import type { HeartbeatEvent, ConnectionEstablishedEvent } from "./runtime/transport";
import type { SessionCreatedEvent, SessionResumedEvent } from "./runtime/session";
import type { AgentStartedEvent, AgentReadyEvent, AgentDestroyedEvent } from "./runtime/agent";
import type {
  ConversationQueuedEvent,
  ConversationStartEvent,
  ConversationThinkingEvent,
  ConversationRespondingEvent,
  ConversationEndEvent,
  ConversationInterruptedEvent,
} from "./runtime/conversation";
import type {
  MessageStartEnvEvent,
  MessageStopEnvEvent,
  TextDeltaEnvEvent,
  ToolCallEnvEvent,
  ToolResultEnvEvent,
  InterruptedEnvEvent,
} from "./runtime/stream";
import type {
  ToolPlannedEnvEvent,
  ToolExecutingEnvEvent,
  ToolCompletedEnvEvent,
  ToolFailedEnvEvent,
} from "./runtime/tool";
import type { ErrorEnvEvent } from "./runtime/error";

/**
 * Union type of all possible Runtime Events.
 */
export type AnyRuntimeEvent =
  // Transport
  | HeartbeatEvent
  | ConnectionEstablishedEvent
  // Session
  | SessionCreatedEvent
  | SessionResumedEvent
  // Agent lifecycle
  | AgentStartedEvent
  | AgentReadyEvent
  | AgentDestroyedEvent
  // Conversation
  | ConversationQueuedEvent
  | ConversationStartEvent
  | ConversationThinkingEvent
  | ConversationRespondingEvent
  | ConversationEndEvent
  | ConversationInterruptedEvent
  // Stream
  | MessageStartEnvEvent
  | MessageStopEnvEvent
  | TextDeltaEnvEvent
  | ToolCallEnvEvent
  | ToolResultEnvEvent
  | InterruptedEnvEvent
  // Tool
  | ToolPlannedEnvEvent
  | ToolExecutingEnvEvent
  | ToolCompletedEnvEvent
  | ToolFailedEnvEvent
  // Error
  | ErrorEnvEvent;

// Backward compatibility alias
export type AnyEcosystemEvent = AnyRuntimeEvent;
