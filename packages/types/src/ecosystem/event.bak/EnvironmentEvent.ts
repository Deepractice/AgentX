/**
 * EnvironmentEvent - All events perceived from external world
 *
 * Architecture:
 * ```
 * EnvironmentEvent (all external perceptions)
 * │
 * ├── DriveableEvent (can drive Agent)
 * │   │
 * │   │   AgentDriver.receive() → DriveableEvent
 * │   │                              ↓
 * │   │                         AgentEngine.process(DriveableEvent)
 * │   │
 * │   ├── MessageStartEvent
 * │   ├── TextDeltaEvent
 * │   ├── ToolCallEvent
 * │   └── ... (all stream events)
 * │
 * └── ConnectionEvent (network status only, does not drive Agent)
 *     ├── ConnectedEvent
 *     └── DisconnectedEvent
 * ```
 *
 * Type-as-Documentation:
 * - DriveableEvent: Events that can drive Agent through Mealy Machine
 * - ConnectionEvent: Network status notifications, not processed by Engine
 */

import type { StreamEventType } from "./agent/stream";

// ============================================================================
// DriveableEvent - Events that can drive Agent
// ============================================================================

/**
 * DriveableEvent - Subset of EnvironmentEvent that can drive Agent
 *
 * These events are:
 * 1. Output by AgentDriver.receive()
 * 2. Processed by AgentEngine.process()
 * 3. Transformed into StateEvent, MessageEvent, TurnEvent
 *
 * Relationship: DriveableEvent ⊂ EnvironmentEvent
 */
export type DriveableEvent = StreamEventType;

// ============================================================================
// ConnectionEvent - Network status events (does not drive Agent)
// ============================================================================

/**
 * Base interface for EnvironmentEvents with timestamp
 */
export interface EnvironmentEventBase<T extends string = string, D = unknown> {
  readonly type: T;
  readonly timestamp: number;
  readonly data: D;
}

/**
 * Connected data (empty)
 */
export interface ConnectedData {}

/**
 * Connection established
 */
export interface ConnectedEvent extends EnvironmentEventBase<"connected", ConnectedData> {}

/**
 * Disconnected data
 */
export interface DisconnectedData {
  readonly reason?: string;
}

/**
 * Connection lost
 */
export interface DisconnectedEvent extends EnvironmentEventBase<"disconnected", DisconnectedData> {}

/**
 * ConnectionEvent - Network status events
 *
 * These events notify about network connection status.
 * They do NOT drive the Agent (not processed by AgentEngine).
 */
export type ConnectionEvent = ConnectedEvent | DisconnectedEvent;

// ============================================================================
// EnvironmentEvent - Union of all external events
// ============================================================================

/**
 * EnvironmentEvent - All events from external world
 *
 * = DriveableEvent | ConnectionEvent
 */
export type EnvironmentEvent = DriveableEvent | ConnectionEvent;

/**
 * Type guard: is this event driveable?
 */
export function isDriveableEvent(event: EnvironmentEvent): event is DriveableEvent {
  // ConnectionEvent types
  const connectionTypes = ["connected", "disconnected"];
  return !connectionTypes.includes((event as any).type);
}

/**
 * Type guard: is this a connection event?
 */
export function isConnectionEvent(event: EnvironmentEvent): event is ConnectionEvent {
  const connectionTypes = ["connected", "disconnected"];
  return connectionTypes.includes((event as any).type);
}
