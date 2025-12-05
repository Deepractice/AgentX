/**
 * EnvironmentEvent - All events from Driver (external LLM)
 *
 * Architecture:
 * ```
 * EnvironmentEvent (from Driver)
 * │
 * ├── DriveableEvent (can drive Engine)
 * │   └── MessageStartEvent, TextDeltaEvent, ToolCallEvent...
 * │
 * └── ConnectionEvent (network status, optional)
 *     └── ConnectedEvent, DisconnectedEvent, ReconnectingEvent
 * ```
 */

import type { AgentEvent } from "../AgentEvent";
import type { DriveableEvent } from "./DriveableEvent";
import type { ConnectionEvent } from "./ConnectionEvent";

/**
 * BaseEnvironmentEvent - Common structure for all environment events
 */
export interface BaseEnvironmentEvent<T extends string = string, D = unknown>
  extends AgentEvent<T, D> {
  /**
   * Turn ID for correlating events within a single turn
   */
  readonly turnId: string;
}

/**
 * EnvironmentEvent - Union of all external world events
 */
export type EnvironmentEvent = DriveableEvent | ConnectionEvent;

/**
 * Type guard: is this event driveable (can drive Agent)?
 */
export function isDriveableEvent(event: EnvironmentEvent): event is DriveableEvent {
  const connectionTypes = ["connected", "disconnected", "reconnecting"];
  return !connectionTypes.includes(event.type);
}

/**
 * Type guard: is this a connection event?
 */
export function isConnectionEvent(event: EnvironmentEvent): event is ConnectionEvent {
  const connectionTypes = ["connected", "disconnected", "reconnecting"];
  return connectionTypes.includes(event.type);
}
