/**
 * Agent Stream Events
 *
 * Real-time streaming events during AI response generation.
 * These events are transformed from DriveableEvent by Driver.
 *
 * Flow:
 * ```
 * Receptor → DriveableEvent { requestId }
 *                ↓
 * Driver (filter by requestId, add agentId)
 *                ↓
 * AgentStreamEvent { context: { agentId, requestId } }
 *                ↓
 * Engine.process()
 * ```
 *
 * Key Design:
 * - DriveableEvent has requestId (from Receptor)
 * - Driver filters events by requestId
 * - Driver transforms to AgentStreamEvent, adding agentId
 * - Engine processes AgentStreamEvent
 */

import type { RuntimeEvent } from "../../RuntimeEvent";
import type { DriveableEvent } from "~/ecosystem/event/environment/DriveableEvent";

/**
 * StreamEventContext - Context added by Driver
 */
export interface StreamEventContext {
  /**
   * Agent instance ID (added by Driver)
   */
  agentId: string;

  /**
   * Request ID (preserved from DriveableEvent)
   */
  requestId: string;
}

/**
 * AgentStreamEvent - DriveableEvent transformed by Driver
 *
 * This is the event type that Engine processes.
 * It combines the original DriveableEvent data with agent context.
 */
export interface AgentStreamEvent<T extends string = string, D = unknown>
  extends RuntimeEvent<T, D> {
  source: "agent";
  category: "stream";
  intent: "notification";

  /**
   * Stream event context (agentId + requestId)
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
 * Used by Driver to add agent context to environment events.
 */
export function toAgentStreamEvent(
  driveableEvent: DriveableEvent,
  agentId: string
): AgentStreamEvent {
  return {
    type: driveableEvent.type,
    timestamp: driveableEvent.timestamp,
    data: driveableEvent.data,
    source: "agent",
    category: "stream",
    intent: "notification",
    context: {
      agentId,
      requestId: driveableEvent.requestId,
    },
    index: "index" in driveableEvent ? driveableEvent.index : undefined,
  } as AgentStreamEvent;
}

/**
 * StreamEvent - Alias for AgentStreamEvent (backwards compatibility)
 */
export type StreamEvent<T extends string = string, D = unknown> = AgentStreamEvent<T, D>;
