/**
 * WebSocket Connection - Server-side connection wrapper
 *
 * Handles:
 * - Heartbeat (ping/pong)
 * - Reliable message delivery with ACK
 * - Message routing
 */

import type { WebSocket as WS } from "ws";
import type {
  ChannelConnection,
  ChannelServerOptions,
  Unsubscribe,
  SendReliableOptions,
} from "@agentxjs/types/network";
import { createLogger } from "@agentxjs/common";
import { isAckMessage, type ReliableWrapper } from "../protocol/reliable-message";

const logger = createLogger("network/WebSocketConnection");

/**
 * WebSocket connection implementation
 */
export class WebSocketConnection implements ChannelConnection {
  public readonly id: string;
  private ws: WS;
  private messageHandlers = new Set<(message: string) => void>();
  private closeHandlers = new Set<() => void>();
  private errorHandlers = new Set<(error: Error) => void>();
  private heartbeatInterval?: ReturnType<typeof setInterval>;
  private isAlive = true;
  private pendingAcks = new Map<
    string,
    { resolve: () => void; timer: ReturnType<typeof setTimeout> }
  >();
  private msgIdCounter = 0;

  constructor(ws: WS, options: ChannelServerOptions) {
    this.ws = ws;
    this.id = `conn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    this.setupHeartbeat(options);
    this.setupMessageHandler();
    this.setupCloseHandler();
    this.setupErrorHandler();
  }

  private setupHeartbeat(options: ChannelServerOptions): void {
    if (options.heartbeat === false) return;

    const interval = options.heartbeatInterval || 30000;

    this.ws.on("pong", () => {
      this.isAlive = true;
      logger.debug("Heartbeat pong received", { id: this.id });
    });

    this.heartbeatInterval = setInterval(() => {
      if (!this.isAlive) {
        logger.warn("Client heartbeat timeout, terminating connection", { id: this.id });
        clearInterval(this.heartbeatInterval);
        this.ws.terminate();
        return;
      }
      this.isAlive = false;
      this.ws.ping();
      logger.debug("Heartbeat ping sent", { id: this.id });
    }, interval);
  }

  private setupMessageHandler(): void {
    this.ws.on("message", (data: Buffer) => {
      const message = data.toString();

      // Try to parse as JSON to check for ACK messages
      try {
        const parsed = JSON.parse(message);

        // Handle ACK response from client
        if (isAckMessage(parsed)) {
          const pending = this.pendingAcks.get(parsed.__ack);
          if (pending) {
            clearTimeout(pending.timer);
            pending.resolve();
            this.pendingAcks.delete(parsed.__ack);
            logger.debug("ACK received", { msgId: parsed.__ack, connectionId: this.id });
          }
          return; // Don't pass ACK messages to application layer
        }
      } catch {
        // Not JSON, pass through as normal message
      }

      // Pass message to handlers
      for (const handler of this.messageHandlers) {
        handler(message);
      }
    });
  }

  private setupCloseHandler(): void {
    this.ws.on("close", () => {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }
      for (const handler of this.closeHandlers) {
        handler();
      }
    });
  }

  private setupErrorHandler(): void {
    this.ws.on("error", (err: Error) => {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }
      for (const handler of this.errorHandlers) {
        handler(err);
      }
    });
  }

  send(message: string): void {
    if (this.ws.readyState === 1) {
      // WebSocket.OPEN
      this.ws.send(message);
    }
  }

  sendReliable(message: string, options?: SendReliableOptions): void {
    if (this.ws.readyState !== 1) {
      // WebSocket not open, trigger timeout immediately if callback provided
      options?.onTimeout?.();
      return;
    }

    // If no ACK callback needed, just send normally
    if (!options?.onAck) {
      this.send(message);
      return;
    }

    // Generate unique message ID
    const msgId = `${this.id}_${++this.msgIdCounter}`;

    // Wrap message with msgId
    const wrapped: ReliableWrapper = {
      __msgId: msgId,
      __payload: message,
    };

    // Set up timeout
    const timeout = options.timeout ?? 5000;
    const timer = setTimeout(() => {
      if (this.pendingAcks.has(msgId)) {
        this.pendingAcks.delete(msgId);
        logger.warn("ACK timeout", { msgId, connectionId: this.id, timeout });
        options.onTimeout?.();
      }
    }, timeout);

    // Store pending ACK
    this.pendingAcks.set(msgId, {
      resolve: options.onAck,
      timer,
    });

    // Send wrapped message
    this.ws.send(JSON.stringify(wrapped));
    logger.debug("Sent reliable message", { msgId, connectionId: this.id });
  }

  onMessage(handler: (message: string) => void): Unsubscribe {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  onClose(handler: () => void): Unsubscribe {
    this.closeHandlers.add(handler);
    return () => {
      this.closeHandlers.delete(handler);
    };
  }

  onError(handler: (error: Error) => void): Unsubscribe {
    this.errorHandlers.add(handler);
    return () => {
      this.errorHandlers.delete(handler);
    };
  }

  close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    // Clean up pending ACKs
    for (const pending of this.pendingAcks.values()) {
      clearTimeout(pending.timer);
    }
    this.pendingAcks.clear();
    this.ws.close();
  }
}
