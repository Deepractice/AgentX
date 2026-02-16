/**
 * RpcClient - JSON-RPC 2.0 Client over WebSocket
 *
 * Provides:
 * - Request/Response with automatic ID matching
 * - Notification handling (stream events)
 * - Timeout management
 * - Reconnection support
 *
 * @example
 * ```typescript
 * const client = new RpcClient({ url: "ws://localhost:5200" });
 * await client.connect();
 *
 * // RPC call
 * const result = await client.call("container.list", {});
 *
 * // Stream events
 * client.onNotification("stream.event", (params) => {
 *   console.log("Event:", params.event);
 * });
 *
 * // Subscribe to topic
 * client.notify("subscribe", { topic: "session-123" });
 * ```
 */

import type { SystemEvent } from "../event/types/base";
import {
  createNotification,
  createRequest,
  isErrorResponse,
  isNotification,
  isStreamEvent,
  isSuccessResponse,
  type NotificationMethod,
  parseMessage,
  type RpcMethod,
  type StreamEventParams,
} from "./jsonrpc";

// ============================================================================
// Types
// ============================================================================

/**
 * Factory function for creating WebSocket instances.
 * Platform layer provides the implementation:
 * - Browser: native WebSocket (default)
 * - Node.js: ws library (via @agentxjs/node-platform)
 */
export type WebSocketFactory = (url: string) => WebSocket;

/**
 * RpcClient configuration
 */
export interface RpcClientConfig {
  /**
   * WebSocket URL
   */
  url: string;

  /**
   * Factory for creating WebSocket instances.
   * If not provided, falls back to the global WebSocket constructor.
   */
  createWebSocket?: WebSocketFactory;

  /**
   * Request timeout in milliseconds (default: 30000)
   */
  timeout?: number;

  /**
   * Auto reconnect on disconnect (default: true)
   */
  autoReconnect?: boolean;

  /**
   * Reconnect delay in milliseconds (default: 3000)
   */
  reconnectDelay?: number;

  /**
   * Headers for authentication (sent in first message after connection)
   */
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>);

  /**
   * Debug logging
   */
  debug?: boolean;
}

/**
 * Pending request state
 */
interface PendingRequest {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Notification handler
 */
type NotificationHandler = (method: string, params: unknown) => void;

/**
 * Stream event handler
 */
type StreamEventHandler = (topic: string, event: SystemEvent) => void;

/**
 * Connection state
 */
export type RpcClientState = "disconnected" | "connecting" | "connected";

// ============================================================================
// RpcClient Implementation
// ============================================================================

/**
 * JSON-RPC 2.0 Client
 */
export class RpcClient {
  private readonly config: RpcClientConfig;
  private readonly timeout: number;
  private readonly pendingRequests = new Map<string | number, PendingRequest>();
  private readonly notificationHandlers = new Set<NotificationHandler>();
  private readonly streamEventHandlers = new Set<StreamEventHandler>();

  private ws: WebSocket | null = null;
  private state: RpcClientState = "disconnected";
  private requestId = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  constructor(config: RpcClientConfig) {
    this.config = config;
    this.timeout = config.timeout ?? 30000;
  }

  // ==================== Properties ====================

  /**
   * Current connection state
   */
  get connectionState(): RpcClientState {
    return this.state;
  }

  /**
   * Whether client is connected
   */
  get connected(): boolean {
    return this.state === "connected";
  }

  // ==================== Connection ====================

  /**
   * Connect to server
   */
  async connect(): Promise<void> {
    if (this.disposed) {
      throw new Error("Client has been disposed");
    }

    if (this.state === "connected") {
      return;
    }

    this.state = "connecting";

    const url = this.config.url;

    // Create WebSocket via injected factory or global WebSocket
    const factory = this.config.createWebSocket ?? ((u: string) => new WebSocket(u));
    const ws = factory(url);

    this.ws = ws;

    return new Promise((resolve, reject) => {
      ws.onopen = async () => {
        this.state = "connected";

        if (this.config.debug) {
          console.log("[RpcClient] Connected to", url);
        }

        // Send auth headers after connection (for environments where
        // WebSocket constructor doesn't support headers, e.g. browser)
        if (this.config.headers) {
          const headers =
            typeof this.config.headers === "function"
              ? await this.config.headers()
              : this.config.headers;
          this.notify("auth" as NotificationMethod, { headers });
        }

        resolve();
      };

      ws.onclose = () => {
        this.state = "disconnected";

        if (this.config.debug) {
          console.log("[RpcClient] Disconnected");
        }

        // Auto reconnect
        if (!this.disposed && this.config.autoReconnect !== false) {
          this.scheduleReconnect();
        }
      };

      ws.onerror = (err) => {
        if (this.config.debug) {
          console.error("[RpcClient] WebSocket error:", err);
        }

        if (this.state === "connecting") {
          this.state = "disconnected";
          reject(new Error("Failed to connect to server"));
        }
      };

      ws.onmessage = (event) => {
        this.handleMessage(event.data as string);
      };
    });
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.state = "disconnected";
  }

  /**
   * Dispose client and clean up resources
   */
  dispose(): void {
    this.disposed = true;

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(new Error("Client disposed"));
      this.pendingRequests.delete(id);
    }

    this.disconnect();
    this.notificationHandlers.clear();
    this.streamEventHandlers.clear();

    if (this.config.debug) {
      console.log("[RpcClient] Disposed");
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    const delay = this.config.reconnectDelay ?? 3000;

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;

      if (!this.disposed && this.state === "disconnected") {
        if (this.config.debug) {
          console.log("[RpcClient] Attempting to reconnect...");
        }

        try {
          await this.connect();
        } catch {
          this.scheduleReconnect();
        }
      }
    }, delay);
  }

  // ==================== RPC Methods ====================

  /**
   * Call an RPC method and wait for response
   */
  async call<T = unknown>(method: RpcMethod, params: unknown): Promise<T> {
    if (!this.connected || !this.ws) {
      throw new Error("Not connected to server");
    }

    const id = ++this.requestId;
    const request = createRequest(id, method, params);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, this.timeout);

      this.pendingRequests.set(id, {
        resolve: resolve as (result: unknown) => void,
        reject,
        timer,
      });

      if (this.config.debug) {
        console.log("[RpcClient] Sending request:", method, params);
      }

      this.ws!.send(JSON.stringify(request));
    });
  }

  /**
   * Send a notification (no response expected)
   */
  notify(method: NotificationMethod | string, params: unknown): void {
    if (!this.connected || !this.ws) {
      if (this.config.debug) {
        console.warn("[RpcClient] Cannot send notification: not connected");
      }
      return;
    }

    const notification = createNotification(method as NotificationMethod, params);

    if (this.config.debug) {
      console.log("[RpcClient] Sending notification:", method, params);
    }

    this.ws.send(JSON.stringify(notification));
  }

  /**
   * Subscribe to a topic (convenience method)
   */
  subscribe(topic: string): void {
    this.notify("subscribe", { topic });
  }

  /**
   * Unsubscribe from a topic (convenience method)
   */
  unsubscribe(topic: string): void {
    this.notify("unsubscribe", { topic });
  }

  // ==================== Event Handlers ====================

  /**
   * Register handler for all notifications
   */
  onNotification(handler: NotificationHandler): () => void {
    this.notificationHandlers.add(handler);
    return () => this.notificationHandlers.delete(handler);
  }

  /**
   * Register handler for stream events
   */
  onStreamEvent(handler: StreamEventHandler): () => void {
    this.streamEventHandlers.add(handler);
    return () => this.streamEventHandlers.delete(handler);
  }

  // ==================== Message Handling ====================

  private handleMessage(data: string): void {
    try {
      const parsed = parseMessage(data);

      // Handle single message
      if (!Array.isArray(parsed)) {
        this.handleParsedMessage(parsed);
      } else {
        // Batch response (rare)
        for (const item of parsed) {
          this.handleParsedMessage(item);
        }
      }
    } catch (err) {
      if (this.config.debug) {
        console.error("[RpcClient] Failed to parse message:", err);
      }
    }
  }

  private handleParsedMessage(parsed: import("jsonrpc-lite").IParsedObject): void {
    if (isSuccessResponse(parsed)) {
      // Success response - resolve pending request
      const payload = parsed.payload as { id: string | number; result: unknown };
      const pending = this.pendingRequests.get(payload.id);

      if (pending) {
        this.pendingRequests.delete(payload.id);
        clearTimeout(pending.timer);
        pending.resolve(payload.result);
      }
    } else if (isErrorResponse(parsed)) {
      // Error response - reject pending request
      const payload = parsed.payload as {
        id: string | number | null;
        error: { code: number; message: string; data?: unknown };
      };

      if (payload.id !== null) {
        const pending = this.pendingRequests.get(payload.id);

        if (pending) {
          this.pendingRequests.delete(payload.id);
          clearTimeout(pending.timer);
          pending.reject(new Error(payload.error.message));
        }
      }
    } else if (isNotification(parsed)) {
      // Notification - stream event or control message
      const payload = parsed.payload as { method: string; params: unknown };

      if (this.config.debug) {
        console.log("[RpcClient] Received notification:", payload.method);
      }

      // Notify all handlers
      for (const handler of this.notificationHandlers) {
        handler(payload.method, payload.params);
      }

      // Handle stream events specially
      if (isStreamEvent(parsed)) {
        const streamPayload = parsed.payload as { params: StreamEventParams };
        const { topic, event } = streamPayload.params;

        for (const handler of this.streamEventHandlers) {
          handler(topic, event);
        }
      }
    }
  }
}
