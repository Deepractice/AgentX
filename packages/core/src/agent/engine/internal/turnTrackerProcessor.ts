/**
 * turnTrackerProcessor
 *
 * Pure Mealy transition function that tracks request-response turn pairs.
 * Derives turn events entirely from stream-layer events (no external injection).
 *
 * Input Events (Stream Layer):
 * - message_start → emit turn_request (a new turn begins)
 * - message_stop  → emit turn_response (turn completes, based on stop reason)
 *
 * Output Events (Turn Layer):
 * - turn_request
 * - turn_response
 */

import type {
  MessageStartEvent,
  MessageStopEvent,
  StreamEvent,
  // Data types
  TokenUsage,
  // Output: Turn events
  TurnRequestEvent,
  TurnResponseEvent,
} from "../../types";
import type { Processor, ProcessorDefinition } from "../mealy";

// ===== State Types =====

/**
 * Pending turn tracking
 */
export interface PendingTurn {
  turnId: string;
  messageId: string;
  content: string;
  requestedAt: number;
}

/**
 * TurnTrackerState
 *
 * Tracks the current turn state.
 */
export interface TurnTrackerState {
  /**
   * Currently pending turn (waiting for response)
   */
  pendingTurn: PendingTurn | null;

  /**
   * Cost per input token (USD)
   */
  costPerInputToken: number;

  /**
   * Cost per output token (USD)
   */
  costPerOutputToken: number;
}

/**
 * Initial state factory for TurnTracker
 */
export function createInitialTurnTrackerState(): TurnTrackerState {
  return {
    pendingTurn: null,
    costPerInputToken: 0.000003, // $3 per 1M tokens
    costPerOutputToken: 0.000015, // $15 per 1M tokens
  };
}

// ===== Processor Implementation =====

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `turn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Output event types from TurnTracker
 */
export type TurnTrackerOutput = TurnRequestEvent | TurnResponseEvent;

/**
 * Input event types for TurnTracker
 * Only stream-layer events — turn events are derived, not injected.
 */
export type TurnTrackerInput = StreamEvent;

/**
 * turnTrackerProcessor
 *
 * Pure Mealy transition function for turn tracking.
 * Pattern: (state, input) => [newState, outputs]
 */
export const turnTrackerProcessor: Processor<
  TurnTrackerState,
  TurnTrackerInput,
  TurnTrackerOutput
> = (state, input): [TurnTrackerState, TurnTrackerOutput[]] => {
  switch (input.type) {
    case "message_start":
      return handleMessageStart(state, input as MessageStartEvent);

    case "message_stop":
      return handleMessageStop(state, input as StreamEvent);

    default:
      return [state, []];
  }
};

/**
 * Handle message_start event — a new turn begins
 */
function handleMessageStart(
  state: Readonly<TurnTrackerState>,
  event: MessageStartEvent
): [TurnTrackerState, TurnTrackerOutput[]] {
  // If there's already a pending turn (e.g. tool_use didn't end the turn),
  // don't start a new one
  if (state.pendingTurn) {
    return [state, []];
  }

  const turnId = generateId();
  const messageId = event.data.messageId ?? "";

  const pendingTurn: PendingTurn = {
    turnId,
    messageId,
    content: "",
    requestedAt: event.timestamp,
  };

  const turnRequestEvent: TurnRequestEvent = {
    type: "turn_request",
    timestamp: Date.now(),
    data: {
      turnId,
      messageId,
      content: "",
      timestamp: event.timestamp,
    },
  };

  return [
    {
      ...state,
      pendingTurn,
    },
    [turnRequestEvent],
  ];
}

/**
 * Handle message_stop event
 */
function handleMessageStop(
  state: Readonly<TurnTrackerState>,
  event: StreamEvent
): [TurnTrackerState, TurnTrackerOutput[]] {
  if (!state.pendingTurn) {
    return [state, []];
  }

  const { data } = event as MessageStopEvent;
  const stopReason = data.stopReason;

  // Complete turn based on stop reason
  // - "end_turn": Normal completion (no tool use)
  // - "tool_use": Tool calling in progress, DON'T complete yet
  // - "max_tokens": Hit token limit, complete turn
  // - "stop_sequence": Hit stop sequence, complete turn
  if (stopReason === "end_turn" || stopReason === "max_tokens" || stopReason === "stop_sequence") {
    return completeTurn(state, event.timestamp);
  }

  // For tool_use, don't complete turn yet
  return [state, []];
}

/**
 * Complete the turn and emit TurnResponseEvent
 */
function completeTurn(
  state: Readonly<TurnTrackerState>,
  completedAt: number
): [TurnTrackerState, TurnTrackerOutput[]] {
  if (!state.pendingTurn) {
    return [state, []];
  }

  const { turnId, messageId, requestedAt } = state.pendingTurn;
  const duration = completedAt - requestedAt;

  const usage: TokenUsage = { inputTokens: 0, outputTokens: 0 };

  const turnResponseEvent: TurnResponseEvent = {
    type: "turn_response",
    timestamp: Date.now(),
    data: {
      turnId,
      messageId,
      duration,
      usage,
      timestamp: completedAt,
    },
  };

  return [
    {
      ...state,
      pendingTurn: null,
    },
    [turnResponseEvent],
  ];
}

/**
 * TurnTracker Processor Definition
 */
export const turnTrackerProcessorDef: ProcessorDefinition<
  TurnTrackerState,
  TurnTrackerInput,
  TurnTrackerOutput
> = {
  name: "TurnTracker",
  description: "Tracks request-response turn pairs",
  initialState: createInitialTurnTrackerState,
  processor: turnTrackerProcessor,
};
