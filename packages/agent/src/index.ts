/**
 * @agentxjs/agent
 *
 * Agent runtime package - combines stateful core and stateless engine.
 *
 * ## Structure
 *
 * - `core/` - Stateful: Agent instance, lifecycle, middleware
 * - `engine/` - Stateless: Pure Mealy Machine event processors
 *
 * ## Design Principles
 *
 * 1. **"Define Once, Run Anywhere"**: AgentDefinition is business config only
 * 2. **Runtime-Injected Driver**: Driver created by Runtime, not AgentDefinition
 * 3. **Sandbox Isolation**: Each Agent has isolated OS + LLM resources
 * 4. **Event-Driven**: All communication via EventBus
 * 5. **Pure Engine**: Engine is stateless Mealy Machines, Core is stateful
 *
 * @packageDocumentation
 */

// ============================================================================
// Core (Stateful)
// ============================================================================

export {
  // Types (re-exported from @agentxjs/types)
  type Agent,
  type AgentContext,
  type AgentDriver,
  type AgentPresenter,
  type AgentDefinition,
  type AgentLifecycle,
  type AgentEventHandler,
  type AgentEventType,
  type Unsubscribe,
  type Container,
  type AgentOutput,
  // Classes (implementations)
  AgentInstance,
  MemoryContainer,
  // Functions
  generateAgentId,
  createAgentContext,
} from "./core";

// ============================================================================
// Engine (Stateless)
// ============================================================================

// AgentEngine
export { AgentEngine, createAgentEngine } from "./engine/AgentEngine";

// AgentProcessor (for advanced use cases)
export {
  agentProcessor,
  createInitialAgentEngineState,
  type AgentEngineState,
  type AgentProcessorInput,
  type AgentProcessorOutput,
} from "./engine/AgentProcessor";

// Internal Processors (for advanced use cases)
export {
  // MessageAssembler
  messageAssemblerProcessor,
  messageAssemblerProcessorDef,
  type MessageAssemblerInput,
  type MessageAssemblerOutput,
  type MessageAssemblerState,
  type PendingContent,
  createInitialMessageAssemblerState,
  // StateEventProcessor
  stateEventProcessor,
  stateEventProcessorDef,
  type StateEventProcessorInput,
  type StateEventProcessorOutput,
  type StateEventProcessorContext,
  createInitialStateEventProcessorContext,
  // TurnTracker
  turnTrackerProcessor,
  turnTrackerProcessorDef,
  type TurnTrackerInput,
  type TurnTrackerOutput,
  type TurnTrackerState,
  type PendingTurn,
  createInitialTurnTrackerState,
} from "./engine/internal";

// Mealy Machine Core (for building custom processors)
export {
  // Core types
  type Source,
  type SourceDefinition,
  type Processor,
  type ProcessorResult,
  type ProcessorDefinition,
  type Sink,
  type SinkDefinition,
  type Store,
  MemoryStore,
  // Combinators
  combineProcessors,
  combineInitialStates,
  chainProcessors,
  filterProcessor,
  mapOutput,
  withLogging,
  identityProcessor,
} from "./engine/mealy";
