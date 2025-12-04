/**
 * RemoteEcosystem - Browser/Remote Ecosystem implementation
 *
 * Assembles ecosystem components for browser environment:
 * - SystemBus: Central event bus
 * - WebSocketEnvironment: WebSocket Receptor + Effector
 *
 * @example
 * ```typescript
 * import { remoteEcosystem } from "@agentxjs/remote-ecosystem";
 *
 * const ecosystem = remoteEcosystem({
 *   url: "wss://api.example.com/ws",
 * });
 *
 * // Subscribe to events
 * ecosystem.bus.on("text_chunk", (event) => {
 *   console.log("Text:", event.data.text);
 * });
 *
 * // Send a message (emits to bus, WebSocketEffector sends to server)
 * ecosystem.bus.emit({
 *   type: "user_message",
 *   data: { content: "Hello!" },
 * });
 *
 * // Clean up
 * ecosystem.dispose();
 * ```
 */

import type { SystemBus, Environment } from "@agentxjs/types";
import { SystemBusImpl } from "./SystemBusImpl";
import { WebSocketEnvironment, type WebSocketEnvironmentConfig } from "./environment";

/**
 * RemoteEcosystem configuration
 */
export interface RemoteEcosystemConfig {
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
 * RemoteEcosystem - Assembled ecosystem for browser/remote
 */
export class RemoteEcosystem {
  /**
   * Central event bus
   */
  readonly bus: SystemBus;

  /**
   * WebSocket environment (Receptor + Effector)
   */
  readonly environment: Environment;

  private readonly wsEnvironment: WebSocketEnvironment;

  constructor(config: RemoteEcosystemConfig) {
    // Create SystemBus
    this.bus = new SystemBusImpl();

    // Create WebSocket environment
    const wsConfig: WebSocketEnvironmentConfig = {
      url: config.url,
      reconnect: config.reconnect,
      reconnectDelay: config.reconnectDelay,
      maxReconnectAttempts: config.maxReconnectAttempts,
    };

    this.wsEnvironment = new WebSocketEnvironment(wsConfig);
    this.environment = this.wsEnvironment;

    // Connect environment to SystemBus
    this.environment.receptor.emit(this.bus);
    this.environment.effector.subscribe(this.bus);
  }

  /**
   * Dispose the ecosystem and clean up resources
   */
  dispose(): void {
    this.wsEnvironment.close();
    this.bus.destroy();
  }
}

/**
 * Create a Remote Ecosystem
 *
 * @example
 * ```typescript
 * const ecosystem = remoteEcosystem({
 *   url: "wss://api.example.com/ws",
 * });
 * ```
 */
export function remoteEcosystem(config: RemoteEcosystemConfig): RemoteEcosystem {
  return new RemoteEcosystem(config);
}
