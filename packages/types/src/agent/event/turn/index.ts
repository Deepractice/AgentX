/**
 * Agent Turn Events
 *
 * Turn-level events for analytics, billing, and metrics.
 * A turn = one user message + assistant response cycle.
 */

import type { AgentEvent } from "../AgentEvent";

/**
 * Token usage information
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens?: number;
}

/**
 * Base TurnEvent
 */
export interface TurnEvent<T extends string = string, D = unknown> extends AgentEvent<T, D> {}

// ============================================================================
// Turn Events
// ============================================================================

/**
 * TurnRequestEvent - Turn started (user message received)
 */
export interface TurnRequestEvent extends TurnEvent<"turn_request"> {
  data: {
    turnId: string;
    messageId: string;
    content: string;
    timestamp: number;
  };
}

/**
 * TurnResponseEvent - Turn completed (assistant response finished)
 */
export interface TurnResponseEvent extends TurnEvent<"turn_response"> {
  data: {
    turnId: string;
    messageId: string;
    duration: number;
    usage?: TokenUsage;
    model?: string;
    stopReason?: string;
    timestamp: number;
  };
}

// ============================================================================
// Union Type
// ============================================================================

/**
 * AgentTurnEvent - All agent turn events
 */
export type AgentTurnEvent = TurnRequestEvent | TurnResponseEvent;

/**
 * Type guard: is this a turn event?
 */
export function isTurnEvent(event: AgentEvent): event is AgentTurnEvent {
  const turnTypes = ["turn_request", "turn_response"];
  return turnTypes.includes(event.type);
}
