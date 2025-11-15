/**
 * BrowserProvider - WebSocket client adapter
 *
 * Implements AgentProvider interface by communicating with WebSocket server.
 * Connects browser-side AgentEventBus to server-side Agent via WebSocket.
 *
 * Architecture:
 * - Browser has its own Agent + AgentEventBus
 * - Server has its own Agent + AgentEventBus
 * - BrowserProvider bridges them via WebSocket transport
 */

import type { AgentProvider, AgentEventBus } from "@deepractice-ai/agentx-core";
import type { AgentEvent } from "@deepractice-ai/agentx-api";
import { AgentConfigError } from "@deepractice-ai/agentx-api";
import type { Subscription } from "rxjs";
import type { BrowserAgentConfig } from "../config/BrowserAgentConfig";

export class BrowserProvider implements AgentProvider {
  readonly sessionId: string;
  providerSessionId: string | null = null;

  private ws!: WebSocket;
  private config: BrowserAgentConfig & {
    reconnect: boolean;
    reconnectDelay: number;
    maxReconnectAttempts: number;
  };
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private isDestroyed: boolean = false;
  private eventBus: AgentEventBus | null = null;
  private outboundSubscription: Subscription | null = null;

  constructor(config: BrowserAgentConfig) {
    this.config = {
      ...config,
      reconnect: config.reconnect ?? true,
      reconnectDelay: config.reconnectDelay ?? 1000,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 5,
    };

    // SessionId will be set from server's system/init event
    // If provided, it will be sent to server for session resumption
    this.sessionId = config.sessionId || this.generateSessionId();
  }

  /**
   * Connect to AgentEventBus and establish WebSocket connection
   */
  async connect(eventBus: AgentEventBus): Promise<void> {
    this.eventBus = eventBus;

    // Subscribe to outbound events (UserMessageEvent)
    this.outboundSubscription = eventBus.outbound().subscribe({
      next: (userEvent) => {
        this.handleOutboundEvent(userEvent);
      },
      error: (error) => {
        console.error("[BrowserProvider] Outbound subscription error:", error);
      },
    });

    // Establish WebSocket connection
    await this.connectWebSocket();
  }

  /**
   * Validate configuration
   */
  validateConfig(config: unknown): void {
    const browserConfig = config as BrowserAgentConfig;

    if (!browserConfig.wsUrl) {
      throw new AgentConfigError("wsUrl is required for BrowserProvider", "wsUrl");
    }
  }

  /**
   * Abort current operation
   */
  abort(): void {
    // Send abort command to server
    if (this.isConnected && this.ws) {
      this.ws.send(
        JSON.stringify({
          type: "abort",
          sessionId: this.sessionId,
        })
      );
    }
  }

  /**
   * Destroy provider and clean up resources
   */
  async destroy(): Promise<void> {
    this.isDestroyed = true;

    // Unsubscribe from outbound events
    if (this.outboundSubscription) {
      this.outboundSubscription.unsubscribe();
      this.outboundSubscription = null;
    }

    // Close WebSocket
    if (this.ws) {
      this.ws.close();
    }

    this.eventBus = null;
    console.log("[BrowserProvider] Destroyed");
  }

  /**
   * Establish WebSocket connection
   */
  private async connectWebSocket(): Promise<void> {
    if (this.isDestroyed) {
      return;
    }

    console.log(`[BrowserProvider] Connecting to ${this.config.wsUrl}`);

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.config.wsUrl);

      this.ws.onopen = () => {
        console.log(`[BrowserProvider] Connected to ${this.config.wsUrl}`);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onmessage = (event) => {
        this.handleServerMessage(event.data);
      };

      this.ws.onerror = (error) => {
        console.error("[BrowserProvider] WebSocket error:", error);
        if (!this.isConnected) {
          reject(new Error("WebSocket connection failed"));
        }
      };

      this.ws.onclose = () => {
        console.log("[BrowserProvider] WebSocket closed");
        this.isConnected = false;
        this.attemptReconnect();
      };
    });
  }

  /**
   * Attempt to reconnect to WebSocket
   */
  private attemptReconnect(): void {
    if (!this.config.reconnect || this.isDestroyed) {
      return;
    }

    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error("[BrowserProvider] Max reconnect attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );

    console.log(`[BrowserProvider] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connectWebSocket();
    }, delay);
  }

  /**
   * Handle outbound events from AgentEventBus (UserMessageEvent)
   * Send to server via WebSocket
   */
  private handleOutboundEvent(userEvent: AgentEvent): void {
    if (!this.isConnected || !this.ws) {
      console.error("[BrowserProvider] Cannot send: WebSocket not connected");
      return;
    }

    // Send UserMessageEvent to server
    this.ws.send(JSON.stringify(userEvent));
  }

  /**
   * Handle incoming server messages
   * Transform to AgentEvent and emit to AgentEventBus (inbound)
   */
  private handleServerMessage(data: string): void {
    if (!this.eventBus) {
      console.error("[BrowserProvider] Cannot handle message: eventBus is null");
      return;
    }

    try {
      const event = JSON.parse(data) as AgentEvent;

      // Capture provider session ID from system init event
      if (event.type === "system" && event.subtype === "init") {
        this.providerSessionId = event.sessionId;
      }

      // Emit to AgentEventBus inbound
      this.eventBus.emit(event);
    } catch (error) {
      console.error("[BrowserProvider] Failed to parse server message:", error);
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
