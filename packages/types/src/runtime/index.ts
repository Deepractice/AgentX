/**
 * Runtime Module - Execution environment for AI Agents
 *
 * Public API for runtime layer.
 *
 * For internal implementation types (Container, LLM, Sandbox, Session, etc.),
 * use `@agentxjs/types/runtime/internal`.
 *
 * @packageDocumentation
 */

// ============================================================================
// Runtime Entry
// ============================================================================

export type {
  Runtime,
  RuntimeEventHandler,
  Unsubscribe,
  ContainerInfo,
  ContainersAPI,
  AgentsAPI,
  EventsAPI,
} from "./Runtime";

export type {
  LLMProvider,
  ClaudeLLMConfig,
  ClaudeLLMProvider,
} from "./LLMProvider";

// ============================================================================
// Agent Runtime
// ============================================================================

export type { Agent } from "./Agent";
export type { AgentConfig } from "./AgentConfig";
export type { AgentLifecycle } from "./AgentLifecycle";

// ============================================================================
// Events (Re-exported from @agentxjs/types/event)
// ============================================================================

export type {
  SystemEvent,
  EventSource,
  EventIntent,
  EventCategory,
} from "~/event/base/SystemEvent";

export type {
  DriveableEvent,
  DriveableEventType,
  MessageStartEvent,
  MessageDeltaEvent,
  MessageStopEvent,
  TextContentBlockStartEvent,
  TextDeltaEvent,
  TextContentBlockStopEvent,
  ToolUseContentBlockStartEvent,
  InputJsonDeltaEvent,
  ToolUseContentBlockStopEvent,
  ToolCallEvent,
  ToolResultEvent,
  InterruptedEvent,
} from "~/event/environment";
