/**
 * ConnectionEvent - Network connection status events
 *
 * These events notify about network connection status.
 * They do NOT drive the Agent (not processed by AgentEngine).
 *
 * Used by RemoteEcosystem to track WebSocket/SSE connection state.
 * All ConnectionEvents have turnId for routing.
 */

import type { BaseEnvironmentEvent } from "./EnvironmentEvent";

/**
 * ConnectedEvent - Connection established
 */
export interface ConnectedEvent extends BaseEnvironmentEvent<"connected"> {
  data: {
    url?: string;
    reconnectAttempt?: number;
  };
}

/**
 * DisconnectedEvent - Connection lost
 */
export interface DisconnectedEvent extends BaseEnvironmentEvent<"disconnected"> {
  data: {
    reason?: string;
    code?: number;
    willReconnect?: boolean;
  };
}

/**
 * ReconnectingEvent - Attempting to reconnect
 */
export interface ReconnectingEvent extends BaseEnvironmentEvent<"reconnecting"> {
  data: {
    attempt: number;
    maxAttempts?: number;
    delayMs: number;
  };
}

/**
 * ConnectionEvent - All network status events
 */
export type ConnectionEvent = ConnectedEvent | DisconnectedEvent | ReconnectingEvent;

/**
 * ConnectionEventType - String literal union
 */
export type ConnectionEventType = ConnectionEvent["type"];
