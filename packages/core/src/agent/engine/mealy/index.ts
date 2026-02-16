/**
 * Mealy - Functional Mealy Machine Framework
 *
 * A Mealy Machine is a finite-state machine where outputs depend on
 * both the current state AND the input: (state, input) => (state, output)
 *
 * Components:
 * - Source: Receives external input (input adapter with side effects)
 * - Processor: Pure Mealy transition function (state is means, outputs are goal)
 * - Sink: Produces output effects (output adapter with side effects)
 * - Store: State storage (external state persistence)
 *
 * Key Insight: Unlike Redux reducers where state is the goal,
 * in Mealy Machine the state is just a means - outputs are the goal.
 */

// ===== Core Components =====

// Processor - Processing (pure Mealy transition function)
export type { Processor, ProcessorDefinition, ProcessorResult } from "./Processor";
// Sink - Output (output adapter)
export type { Sink, SinkDefinition } from "./Sink";
// Source - Input (input adapter)
export type { Source, SourceDefinition } from "./Source";

// Store - State storage
export { MemoryStore, type Store } from "./Store";

// ===== Mealy Runtime =====

export { createMealy, Mealy, type MealyConfig, type ProcessResult } from "./Mealy";

// ===== Combinators =====

export {
  chainProcessors,
  combineInitialStates,
  combineProcessors,
  filterProcessor,
  identityProcessor,
  mapOutput,
  withLogging,
} from "./combinators";
