/**
 * WebSocketDriver - Client-side WebSocket driver
 *
 * Receives messages from WebSocket server and converts them to Agent events.
 * This is used by browser clients to connect to a remote Agent.
 */

import type { AgentDriver } from "@deepractice-ai/agentx-core";
import type { EventBus } from "@deepractice-ai/agentx-event";

export interface WebSocketDriverConfig {
  /**
   * WebSocket URL to connect to
   * @example "ws://localhost:5200/ws"
   */
  url: string;

  /**
   * Session ID for this agent instance
   * Used to identify the conversation session
   */
  sessionId: string;

  /**
   * Auto-reconnect on disconnect
   * @default true
   */
  autoReconnect?: boolean;

  /**
   * Reconnect delay in milliseconds
   * @default 1000
   */
  reconnectDelay?: number;

  /**
   * Maximum reconnection attempts
   * @default 5
   */
  maxReconnectAttempts?: number;
}

/**
 * WebSocket Driver for browser clients
 *
 * Converts WebSocket messages → Agent events
 */
export class WebSocketDriver implements AgentDriver {
  readonly sessionId: string;
  readonly driverSessionId: string;

  private ws: WebSocket | null = null;
  private eventBus: EventBus | null = null;
  private config: Required<WebSocketDriverConfig>;
  private reconnectAttempts = 0;
  private isConnecting = false;
  private isDestroyed = false;

  constructor(config: WebSocketDriverConfig) {
    this.sessionId = config.sessionId;
    this.driverSessionId = `ws-driver-${config.sessionId}`;

    this.config = {
      url: config.url,
      sessionId: config.sessionId,
      autoReconnect: config.autoReconnect ?? true,
      reconnectDelay: config.reconnectDelay ?? 1000,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 5,
    };
  }

  /**
   * Connect to WebSocket server and start forwarding events
   */
  async connect(eventBus: EventBus): Promise<void> {
    if (this.isConnecting) {
      throw new Error("WebSocketDriver is already connecting");
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      throw new Error("WebSocketDriver is already connected");
    }

    this.eventBus = eventBus;
    this.isConnecting = true;

    try {
      await this.createConnection();
      this.isConnecting = false;
      this.reconnectAttempts = 0;
    } catch (error) {
      this.isConnecting = false;
      throw error;
    }
  }

  /**
   * Create WebSocket connection
   */
  private createConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url);

        // Handle connection open
        this.ws.onopen = () => {
          console.log(`[WebSocketDriver] Connected to ${this.config.url}`);
          resolve();
        };

        // Handle incoming messages (WebSocket → Events)
        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        // Handle connection close
        this.ws.onclose = (event) => {
          console.log(`[WebSocketDriver] Disconnected (code: ${event.code})`);
          this.handleDisconnect();
        };

        // Handle errors
        this.ws.onerror = (error) => {
          console.error("[WebSocketDriver] WebSocket error:", error);

          // Emit error event
          this.eventBus?.emit("error_occurred_state", {
            type: "error_occurred_state",
            timestamp: Date.now(),
            data: {
              error: error instanceof Error ? error : new Error("WebSocket error"),
              context: "websocket_connection",
            },
          });

          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(data: string): void {
    try {
      const event = JSON.parse(data);

      if (!event.type) {
        console.warn("[WebSocketDriver] Received event without type:", event);
        return;
      }

      // Forward event to EventBus
      this.eventBus?.emit(event.type, event);
    } catch (error) {
      console.error("[WebSocketDriver] Failed to parse message:", error);
    }
  }

  /**
   * Handle WebSocket disconnect
   */
  private handleDisconnect(): void {
    if (this.isDestroyed) {
      return;
    }

    // Attempt reconnect if enabled
    if (this.config.autoReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `[WebSocketDriver] Reconnecting (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})...`
      );

      setTimeout(() => {
        if (!this.isDestroyed && this.eventBus) {
          this.createConnection().catch((error) => {
            console.error("[WebSocketDriver] Reconnection failed:", error);
          });
        }
      }, this.config.reconnectDelay);
    } else {
      console.log("[WebSocketDriver] Max reconnection attempts reached");
    }
  }

  /**
   * Send message to WebSocket server
   */
  send(message: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Abort current operation (no-op for WebSocket)
   */
  abort(): void {
    // WebSocket driver doesn't support aborting individual operations
    console.log("[WebSocketDriver] Abort called (no-op)");
  }

  /**
   * Destroy driver and close WebSocket connection
   */
  async destroy(): Promise<void> {
    this.isDestroyed = true;

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.eventBus = null;
    console.log("[WebSocketDriver] Destroyed");
  }
}
