/**
 * Agent Stream Events
 *
 * Real-time streaming events during AI response generation.
 * These events are transformed from DriveableEvent by Driver.
 *
 * Flow:
 * ```
 * Driver → DriveableEvent
 *              ↓
 * Engine (add context)
 *              ↓
 * AgentStreamEvent { context: { agentId } }
 *              ↓
 * Presenter
 * ```
 */

import type { AgentEvent } from "../AgentEvent";
import type { DriveableEvent } from "../environment/DriveableEvent";

/**
 * StreamEventContext - Context added by Driver
 */
export interface StreamEventContext {
  /**
   * Agent instance ID (added by Driver)
   */
  agentId: string;

  /**
   * Turn ID (preserved from DriveableEvent)
   */
  turnId: string;
}

/**
 * AgentStreamEvent - DriveableEvent transformed by Driver
 *
 * This is the event type that Engine processes.
 * It combines the original DriveableEvent data with agent context.
 */
export interface AgentStreamEvent<T extends string = string, D = unknown>
  extends AgentEvent<T, D> {
  /**
   * Stream event context (agentId + turnId)
   */
  context: StreamEventContext;

  /**
   * Content block index (optional, for multi-block responses)
   */
  index?: number;
}

/**
 * Transform DriveableEvent to AgentStreamEvent
 *
 * Used by Engine to add agent context to driver events.
 */
export function toAgentStreamEvent(
  driveableEvent: DriveableEvent,
  agentId: string
): AgentStreamEvent {
  return {
    type: driveableEvent.type,
    timestamp: driveableEvent.timestamp,
    data: driveableEvent.data,
    context: {
      agentId,
      turnId: driveableEvent.turnId,
    },
    index: "index" in driveableEvent ? driveableEvent.index : undefined,
  } as AgentStreamEvent;
}

/**
 * StreamEvent - Alias for AgentStreamEvent (backwards compatibility)
 */
export type StreamEvent<T extends string = string, D = unknown> = AgentStreamEvent<T, D>;
