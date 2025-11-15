/**
 * Browser Agent Configuration
 *
 * Configuration for creating an Agent instance in browser environment.
 * This SDK connects to WebSocket server (agentx-node).
 */

export interface BrowserAgentConfig {
  /**
   * WebSocket server URL (required)
   * @example "ws://localhost:5200/ws"
   */
  wsUrl: string;

  /**
   * Session ID (optional)
   * - If provided: Resume existing session on server
   * - If not provided: Server generates new session
   */
  sessionId?: string;

  /**
   * Auto-reconnect on disconnect
   * @default true
   */
  reconnect?: boolean;

  /**
   * Reconnect delay in milliseconds
   * @default 1000
   */
  reconnectDelay?: number;

  /**
   * Max reconnect attempts
   * @default 5
   */
  maxReconnectAttempts?: number;
}
