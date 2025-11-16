/**
 * Exchange Layer
 *
 * Request-response exchange events.
 * An exchange is a complete request-response cycle.
 *
 * Exchange perspective:
 * - Groups related messages into request-response units
 * - Tracks exchange-level metrics (duration, cost, tokens)
 * - Provides clear boundaries for each interaction cycle
 *
 * Example flow:
 * 1. ExchangeRequestEvent - User sends request
 * 2. [Processing happens - Stream/State/Message events]
 * 3. ExchangeResponseEvent - Assistant completes response
 */

export type { ExchangeEvent } from "./ExchangeEvent";
export type { ExchangeRequestEvent } from "./ExchangeRequestEvent";
export type { ExchangeResponseEvent } from "./ExchangeResponseEvent";

/**
 * Union of all Exchange events
 */
export type ExchangeEventType =
  | import("./ExchangeRequestEvent").ExchangeRequestEvent
  | import("./ExchangeResponseEvent").ExchangeResponseEvent;

