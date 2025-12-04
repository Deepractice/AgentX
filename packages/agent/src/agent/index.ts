/**
 * Agent module exports
 *
 * Types/interfaces are re-exported from @agentxjs/types.
 * Implementations and utilities are defined here.
 */

// Re-export types from @agentxjs/types
export type {
  Agent,
  AgentDriver,
  AgentPresenter,
  AgentDefinition,
  Container,
  AgentContext,
  AgentOutput,
  AgentLifecycle,
  AgentEventHandler,
  AgentEventType,
  Unsubscribe,
  StateChange,
  StateChangeHandler,
  // SystemBus (replaces AgentEventBus)
  SystemBus,
  SubscribeOptions,
} from "@agentxjs/types";

// Implementation
export { AgentInstance } from "./AgentInstance";

// State Machine
export { AgentStateMachine } from "./AgentStateMachine";
export type { StateChangeHandler as StateMachineHandler } from "./AgentStateMachine";

// Container implementation
export { MemoryContainer } from "./MemoryContainer";

// Context utilities
export { generateAgentId, createAgentContext } from "./AgentContext";
