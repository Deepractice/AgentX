/**
 * Reactors
 *
 * - Interfaces: Pure interface definitions (re-exported from ../interfaces)
 * - Adapters: Internal adapter implementations
 * - Implementations: Concrete reactor implementations (WebSocketReactor, etc.)
 */

// Re-export interfaces from interfaces/
export type { StreamReactor } from "../interfaces/StreamReactor";
export type { StateReactor } from "../interfaces/StateReactor";
export type { MessageReactor } from "../interfaces/MessageReactor";
export type { ExchangeReactor } from "../interfaces/ExchangeReactor";

// Export adapters (from internal/)
export {
  StreamReactorAdapter,
  StateReactorAdapter,
  MessageReactorAdapter,
  ExchangeReactorAdapter,
  wrapUserReactor,
  type UserReactor,
} from "../internal";

// Export reactor implementations
export { WebSocketReactor, type WebSocketLike, type WebSocketReactorConfig } from "./WebSocketReactor";
