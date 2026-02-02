/**
 * WebSocket Client - Node.js implementation
 *
 * Features:
 * - ws library based
 * - Custom headers support
 * - Auto ACK for reliable messages
 */

import type { ChannelClient, ChannelClientOptions, Unsubscribe } from "@agentxjs/types/network";
import { createLogger } from "@agentxjs/common";
import { isReliableWrapper } from "../protocol/reliable-message";

const logger = createLogger("network/WebSocketClient");

/**
 * WebSocket Client (Node.js version)
 */
export class WebSocketClient implements ChannelClient {
  private ws: WebSocket | null = null;
  private serverUrl: string;
  private headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>);
  private messageHandlers = new Set<(message: string) => void>();
  private openHandlers = new Set<() => void>();
  private closeHandlers = new Set<() => void>();
  private errorHandlers = new Set<(error: Error) => void>();

  constructor(options: ChannelClientOptions) {
    this.serverUrl = options.serverUrl;
    this.headers = options.headers;
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

    const { WebSocket: NodeWebSocket } = await import("ws");

    // Resolve headers (support static, sync function, and async function)
    let resolvedHeaders: Record<string, string> | undefined;
    if (this.headers) {
      if (typeof this.headers === "function") {
        resolvedHeaders = await Promise.resolve(this.headers());
      } else {
        resolvedHeaders = this.headers;
      }
    }

    // Create WebSocket with headers (Node.js ws library supports this)
    this.ws = new NodeWebSocket(this.serverUrl, {
      headers: resolvedHeaders,
    }) as unknown as WebSocket;

    return new Promise<void>((resolve, reject) => {
      const onOpen = () => {
        logger.info("WebSocket connected", { serverUrl: this.serverUrl });
        for (const handler of this.openHandlers) {
          handler();
        }
        resolve();
      };

      const onError = (err?: Error) => {
        logger.error("WebSocket connection failed", {
          serverUrl: this.serverUrl,
          error: err?.message,
        });
        reject(err || new Error("WebSocket connection failed"));
      };

      (this.ws as any).once("open", onOpen);
      (this.ws as any).once("error", onError);

      // Setup permanent handlers
      (this.ws as any).on("message", (data: Buffer) => {
        const message = data.toString();
        this.handleMessage(message);
      });

      (this.ws as any).on("close", () => {
        logger.warn("WebSocket closed");
        for (const handler of this.closeHandlers) {
          handler();
        }
      });

      (this.ws as any).on("error", (err: Error) => {
        logger.error("WebSocket error", { error: err.message });
        for (const handler of this.errorHandlers) {
          handler(err);
        }
      });
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
