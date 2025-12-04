/**
 * Agent Turn Events
 *
 * Turn-level events for analytics, billing, and metrics.
 * A turn = one user message + assistant response cycle.
 */

import type { RuntimeEvent } from "../../RuntimeEvent";
import type { TokenUsage } from "~/ecosystem/runtime/container/llm/TokenUsage";

/**
 * Base TurnEvent
 */
export interface TurnEvent<T extends string = string, D = unknown> extends RuntimeEvent<T, D> {
  source: "agent";
  category: "turn";
  intent: "notification";
}

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
export function isTurnEvent(event: RuntimeEvent): event is AgentTurnEvent {
  return event.source === "agent" && event.category === "turn";
}
