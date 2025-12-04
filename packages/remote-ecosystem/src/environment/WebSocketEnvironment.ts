/**
 * WebSocketEnvironment - Remote Environment via WebSocket
 *
 * Combines:
 * - WebSocketReceptor: Receives WS messages → emits to SystemBus
 * - WebSocketEffector: Subscribes to SystemBus → sends via WS
 *
 * Single WebSocket connection for bidirectional communication.
 */

import type { Environment, Receptor, Effector } from "@agentxjs/types";
import { WebSocketReceptor, type WebSocketReceptorConfig } from "./WebSocketReceptor";
import { WebSocketEffector } from "./WebSocketEffector";

/**
 * WebSocketEnvironment configuration
 */
export interface WebSocketEnvironmentConfig {
  /**
   * WebSocket endpoint URL (ws:// or wss://)
   */
  url: string;

  /**
   * Reconnect on disconnect (default: true)
   */
  reconnect?: boolean;

  /**
   * Reconnect delay in ms (default: 3000)
   */
  reconnectDelay?: number;

  /**
   * Max reconnect attempts (default: 5)
   */
  maxReconnectAttempts?: number;
}

/**
 * WebSocketEnvironment - Remote environment via WebSocket
 */
export class WebSocketEnvironment implements Environment {
  readonly name = "websocket";
  readonly receptor: Receptor;
  readonly effector: Effector;

  private readonly wsReceptor: WebSocketReceptor;

  constructor(config: WebSocketEnvironmentConfig) {
    const receptorConfig: WebSocketReceptorConfig = {
      url: config.url,
      reconnect: config.reconnect,
      reconnectDelay: config.reconnectDelay,
      maxReconnectAttempts: config.maxReconnectAttempts,
    };

    this.wsReceptor = new WebSocketReceptor(receptorConfig);

    // Effector shares the WebSocket connection from Receptor
    const wsEffector = new WebSocketEffector({
      getWebSocket: () => (this.wsReceptor as any).ws,
    });

    this.receptor = this.wsReceptor;
    this.effector = wsEffector;
  }

  /**
   * Close WebSocket connection
   */
  close(): void {
    this.wsReceptor.close();
  }
}
