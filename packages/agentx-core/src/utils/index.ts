/**
 * Utilities
 *
 * Public utilities for building drivers and reactors.
 * These are helper tools that framework and user code can use.
 */

// Stream event building utility
export { StreamEventBuilder } from "./StreamEventBuilder";

// Error emission utility
export { emitError } from "./emitError";

// Reactor adapters - convert user-friendly interfaces to AgentReactor
export {
  StreamReactorAdapter,
  StateReactorAdapter,
  MessageReactorAdapter,
  TurnReactorAdapter,
  wrapUserReactor,
  type UserReactor,
} from "./ReactorAdapter";
