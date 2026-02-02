/**
 * Browser WebSocket Client - Browser implementation with auto-reconnect
 *
 * Features:
 * - reconnecting-websocket based
 * - Auto reconnect on disconnect
 * - Auth headers via first message (browser limitation)
 * - Auto ACK for reliable messages
 */

import type { ChannelClient, ChannelClientOptions, Unsubscribe } from "@agentxjs/types/network";
import { createLogger } from "@agentxjs/common";
import { isReliableWrapper } from "../protocol/reliable-message";

const logger = createLogger("network/BrowserWebSocketClient");

/**
 * Browser WebSocket Client with auto-reconnect
 */
export class BrowserWebSocketClient implements ChannelClient {
  private ws: WebSocket | null = null;
  private serverUrl: string;
  private options: ChannelClientOptions;
  private messageHandlers = new Set<(message: string) => void>();
  private openHandlers = new Set<() => void>();
  private closeHandlers = new Set<() => void>();
  private errorHandlers = new Set<(error: Error) => void>();
  private hasConnectedBefore = false;

  constructor(options: ChannelClientOptions) {
    this.serverUrl = options.serverUrl;
    this.options = {
      autoReconnect: true,
      minReconnectionDelay: 1000,
      maxReconnectionDelay: 10000,
      maxRetries: Infinity,
      connectionTimeout: 4000,
      debug: false,
      ...options,
    };
  }

  get readyState(): "connecting" | "open" | "closing" | "closed" {
    if (!this.ws) return "closed";
    const state = this.ws.readyState;
    if (state === 0) return "connecting";
    if (state === 1) return "open";
    if (state === 2) return "closing";
    return "closed";
  }

  async connect(): Promise<void> {
    if (this.ws) {
      throw new Error("Already connected or connecting");
    }

    // Resolve headers before creating WebSocket (if any)
    let resolvedHeaders: Record<string, string> | undefined;
    if (this.options.headers) {
      if (typeof this.options.headers === "function") {
        resolvedHeaders = await Promise.resolve(this.options.headers());
      } else {
        resolvedHeaders = this.options.headers;
      }
    }

    logger.debug("Connecting to WebSocket", {
      serverUrl: this.serverUrl,
      autoReconnect: this.options.autoReconnect,
      connectionTimeout: this.options.connectionTimeout,
    });

    if (this.options.autoReconnect) {
      // Use reconnecting-websocket for auto-reconnect
      const ReconnectingWebSocket = (await import("reconnecting-websocket")).default;
      logger.debug("Using ReconnectingWebSocket");
      this.ws = new ReconnectingWebSocket(this.serverUrl, [], {
        maxReconnectionDelay: this.options.maxReconnectionDelay,
        minReconnectionDelay: this.options.minReconnectionDelay,
        reconnectionDelayGrowFactor: 1.3,
        connectionTimeout: this.options.connectionTimeout,
        maxRetries: this.options.maxRetries,
        debug: this.options.debug,
      });
    } else {
      // Use native WebSocket
      logger.debug("Using native WebSocket");
      this.ws = new WebSocket(this.serverUrl);
    }

    return new Promise<void>((resolve, reject) => {
      const onOpen = async () => {
        if (this.hasConnectedBefore) {
          logger.info("WebSocket reconnected successfully", { serverUrl: this.serverUrl });
        } else {
          logger.info("WebSocket connected", { serverUrl: this.serverUrl });
          this.hasConnectedBefore = true;
        }

        // Browser WebSocket API doesn't support custom headers in handshake
        // Send authentication message as first message instead
        if (resolvedHeaders && Object.keys(resolvedHeaders).length > 0) {
          try {
            const authMessage = JSON.stringify({
              type: "auth",
              headers: resolvedHeaders,
            });
            this.ws!.send(authMessage);
            logger.info("Sent authentication message to server");
          } catch (error) {
            logger.error("Failed to send authentication message", { error });
          }
        }

        for (const handler of this.openHandlers) {
          handler();
        }
        resolve();
      };

      const onError = (_event: Event) => {
        logger.error("WebSocket connection failed", { serverUrl: this.serverUrl });
        const error = new Error("WebSocket connection failed");
        for (const handler of this.errorHandlers) {
          handler(error);
        }
        reject(error);
      };

      this.ws!.addEventListener("open", onOpen as any, { once: true });
      this.ws!.addEventListener("error", onError as any, { once: true });

      // Setup permanent handlers
      this.ws!.addEventListener("message", ((event: any) => {
        const message = event.data;
        this.handleMessage(message);
      }) as any);

      this.ws!.addEventListener("close", (() => {
        logger.info("WebSocket closed, attempting to reconnect...");
        for (const handler of this.closeHandlers) {
          handler();
        }
      }) as any);

      this.ws!.addEventListener("error", ((_event: Event) => {
        logger.error("WebSocket error");
        const error = new Error("WebSocket error");
        for (const handler of this.errorHandlers) {
          handler(error);
        }
      }) as any);
    });
  }

  private handleMessage(message: string): void {
    // Check for reliable message wrapper and auto-send ACK
    try {
      const parsed = JSON.parse(message);
      if (isReliableWrapper(parsed)) {
        // Send ACK immediately
        this.ws!.send(JSON.stringify({ __ack: parsed.__msgId }));
        logger.debug("Auto-sent ACK", { msgId: parsed.__msgId });

        // Pass unwrapped payload to handlers
        for (const handler of this.messageHandlers) {
          handler(parsed.__payload);
        }
        return;
      }
    } catch {
      // Not JSON, pass through as normal message
    }

    for (const handler of this.messageHandlers) {
      handler(message);
    }
  }

  send(message: string): void {
    if (!this.ws || this.ws.readyState !== 1) {
      throw new Error("WebSocket is not open");
    }
    this.ws.send(message);
  }

  onMessage(handler: (message: string) => void): Unsubscribe {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  onOpen(handler: () => void): Unsubscribe {
    this.openHandlers.add(handler);
    return () => {
      this.openHandlers.delete(handler);
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
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  dispose(): void {
    this.close();
    this.messageHandlers.clear();
    this.openHandlers.clear();
    this.closeHandlers.clear();
    this.errorHandlers.clear();
  }
}
