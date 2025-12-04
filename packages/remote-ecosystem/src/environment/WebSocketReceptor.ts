/**
 * WebSocketReceptor - Receives WebSocket messages and emits to SystemBus
 *
 * Perceives the remote server via WebSocket connection.
 * Converts WebSocket messages to events and emits to SystemBus.
 */

import type { Receptor, SystemBus } from "@agentxjs/types";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("ecosystem/WebSocketReceptor");

/**
 * WebSocketReceptor configuration
 */
export interface WebSocketReceptorConfig {
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
 * WebSocketReceptor - Perceives remote server via WebSocket
 */
export class WebSocketReceptor implements Receptor {
  private readonly config: WebSocketReceptorConfig;
  private bus: SystemBus | null = null;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private isClosing = false;

  constructor(config: WebSocketReceptorConfig) {
    this.config = {
      reconnect: true,
      reconnectDelay: 3000,
      maxReconnectAttempts: 5,
      ...config,
    };
  }

  /**
   * Start emitting events to SystemBus
   */
  emit(bus: SystemBus): void {
    this.bus = bus;
    this.connect();
  }

  /**
   * Connect to WebSocket endpoint
   */
  private connect(): void {
    if (this.ws) {
      this.ws.close();
    }

    logger.debug("Connecting to WebSocket", { url: this.config.url });

    this.ws = new WebSocket(this.config.url);

    this.ws.onopen = () => {
      logger.info("WebSocket connection established");
      this.reconnectAttempts = 0;
      this.emitToBus({
        type: "connection_established",
        timestamp: Date.now(),
        data: { url: this.config.url },
      });
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event);
    };

    this.ws.onerror = (error) => {
      logger.error("WebSocket error", { error });
      this.emitToBus({
        type: "connection_error",
        timestamp: Date.now(),
        data: { error: "WebSocket connection error" },
      });
    };

    this.ws.onclose = (event) => {
      logger.debug("WebSocket closed", { code: event.code, reason: event.reason });

      if (!this.isClosing && this.config.reconnect) {
        this.attemptReconnect();
      }
    };
  }

  /**
   * Handle WebSocket message
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      logger.debug("WebSocket message received", { type: data.type });

      // Emit the event as-is to SystemBus
      this.emitToBus({
        type: data.type || "unknown",
        timestamp: data.timestamp || Date.now(),
        ...data,
      });
    } catch (error) {
      logger.error("Failed to parse WebSocket message", { error, data: event.data });
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= (this.config.maxReconnectAttempts ?? 5)) {
      logger.error("Max reconnect attempts reached");
      this.emitToBus({
        type: "connection_failed",
        timestamp: Date.now(),
        data: { reason: "Max reconnect attempts reached" },
      });
      return;
    }

    this.reconnectAttempts++;
    logger.debug("Reconnecting...", { attempt: this.reconnectAttempts });

    setTimeout(() => {
      this.connect();
    }, this.config.reconnectDelay);
  }

  /**
   * Emit event to SystemBus
   */
  private emitToBus(event: { type: string; timestamp: number; data?: unknown }): void {
    if (this.bus) {
      this.bus.emit(event);
    }
  }

  /**
   * Close WebSocket connection
   */
  close(): void {
    this.isClosing = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      logger.debug("WebSocket connection closed");
    }
  }
}
