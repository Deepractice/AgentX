/**
 * Runtime Module - Execution environment for AI Agents
 *
 * ## Event Architecture (Simplified)
 *
 * Two types of events:
 * 1. **EnvironmentEvent** - External raw materials (text_chunk, stream_start, etc.)
 * 2. **AgentEvent** - Agent internal events (assembled by Mealy Machine)
 *
 * EnvironmentEvent + context flows on SystemBus directly.
 *
 * @see issues/029-simplified-event-architecture.md
 * @packageDocumentation
 */

// ============================================================================
// Pure Abstractions (Systems Theory)
// ============================================================================

export type { Runtime, RuntimeEventHandler } from "./Runtime";
export type { Environment } from "./environment/Environment";
export type { Effector } from "./environment/Effector";
export type {
  SystemBus,
  BusEvent,
  BusEventHandler,
  SubscribeOptions,
  Unsubscribe,
} from "./event/SystemBus";

// Receptor (external world perception)
export type { Receptor } from "./environment/Receptor";

// ============================================================================
// Environment Events
// ============================================================================

export * from "./event";

// ============================================================================
// Container Layer
// ============================================================================

// Container, Sandbox, and LLM
export * from "./container";
export * from "./container/sandbox";
export * from "./container/llm";

// Session
export * from "./session";

// ============================================================================
// Agent Runtime Config
// ============================================================================

export type { AgentConfig } from "./AgentConfig";
export type { AgentContext } from "./AgentContext";

// ============================================================================
// Facades
// ============================================================================

export * from "./facade";
