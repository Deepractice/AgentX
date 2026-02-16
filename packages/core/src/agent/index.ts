/**
 * @agentxjs/agent
 *
 * Agent package - Event Processing Unit for AI conversations.
 *
 * ## Core API
 *
 * ```typescript
 * import { createAgent } from "@agentxjs/agent";
 *
 * const agent = createAgent({
 *   driver: myDriver,
 *   presenter: myPresenter,
 * });
 *
 * agent.on("text_delta", (e) => console.log(e.data.text));
 * await agent.receive("Hello!");
 * ```
 *
 * ## Architecture
 *
 * - Driver: Produces StreamEvents from LLM
 * - Agent: Processes events, manages state and queue
 * - Presenter: Consumes AgentOutput events
 *
 * @packageDocumentation
 */

// ============================================================================
// Core API
// ============================================================================

export { AgentStateMachine } from "./AgentStateMachine";
export { createAgent } from "./createAgent";
export type { AgentEngine, CreateAgentOptions } from "./types";

// ============================================================================
// Types (re-export all types from types.ts)
// ============================================================================

export * from "./types";

// ============================================================================
// Engine (Stateless)
// ============================================================================

// AgentProcessor (for advanced use cases)
export {
  type AgentEngineState,
  type AgentProcessorInput,
  type AgentProcessorOutput,
  agentProcessor,
  createInitialAgentEngineState,
} from "./engine/AgentProcessor";
// Internal Processors (for advanced use cases)
export {
  createInitialMessageAssemblerState,
  createInitialStateEventProcessorContext,
  createInitialTurnTrackerState,
  type MessageAssemblerInput,
  type MessageAssemblerOutput,
  type MessageAssemblerState,
  // MessageAssembler
  messageAssemblerProcessor,
  messageAssemblerProcessorDef,
  type PendingContent,
  type PendingTurn,
  type StateEventProcessorContext,
  type StateEventProcessorInput,
  type StateEventProcessorOutput,
  // StateEventProcessor
  stateEventProcessor,
  stateEventProcessorDef,
  type TurnTrackerInput,
  type TurnTrackerOutput,
  type TurnTrackerState,
  // TurnTracker
  turnTrackerProcessor,
  turnTrackerProcessorDef,
} from "./engine/internal";
// MealyMachine
export { createMealyMachine, MealyMachine } from "./engine/MealyMachine";

// Mealy Machine Core (for building custom processors)
export {
  chainProcessors,
  combineInitialStates,
  // Combinators
  combineProcessors,
  filterProcessor,
  identityProcessor,
  MemoryStore,
  mapOutput,
  type Processor,
  type ProcessorDefinition,
  type ProcessorResult,
  type Sink,
  type SinkDefinition,
  // Core types
  type Source,
  type SourceDefinition,
  type Store,
  withLogging,
} from "./engine/mealy";
