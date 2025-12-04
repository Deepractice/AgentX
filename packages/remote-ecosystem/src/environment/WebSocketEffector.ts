/**
 * WebSocketEffector - Sends messages to remote server via WebSocket
 *
 * Subscribes to SystemBus for user_message events.
 * Sends messages to server via WebSocket.
 */

import type { Effector, SystemBus, UserMessage } from "@agentxjs/types";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("ecosystem/WebSocketEffector");

/**
 * WebSocketEffector configuration
 */
export interface WebSocketEffectorConfig {
  /**
   * WebSocket instance to use for sending
   */
  getWebSocket: () => WebSocket | null;
}

/**
 * WebSocketEffector - Sends messages via WebSocket
 */
export class WebSocketEffector implements Effector {
  private readonly getWebSocket: () => WebSocket | null;

  constructor(config: WebSocketEffectorConfig) {
    this.getWebSocket = config.getWebSocket;
  }

  /**
   * Subscribe to SystemBus
   */
  subscribe(bus: SystemBus): void {
    logger.debug("WebSocketEffector subscribing to SystemBus");

    // Listen for user_message events
    bus.on("user_message", (event) => {
      const message = (event as { type: string; data: UserMessage }).data;
      this.send({ type: "user_message", data: message });
    });

    // Listen for interrupt events
    bus.on("interrupt", () => {
      this.send({ type: "interrupt" });
    });
  }

  /**
   * Send message via WebSocket
   */
  private send(payload: { type: string; data?: unknown }): void {
    const ws = this.getWebSocket();

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      logger.error("WebSocket not connected, cannot send message");
      return;
    }

    logger.debug("Sending via WebSocket", { type: payload.type });

    try {
      ws.send(JSON.stringify(payload));
    } catch (error) {
      logger.error("Failed to send WebSocket message", { error });
    }
  }
}
