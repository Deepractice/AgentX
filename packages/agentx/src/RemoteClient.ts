/**
 * RemoteClient - WebSocket client for AgentX server
 */

import type { BusEvent, EventBus, BusEventHandler, Unsubscribe } from "@agentxjs/core/event";
import { EventBusImpl } from "@agentxjs/core/event";
import { generateRequestId } from "commonxjs/id";
import { createLogger } from "commonxjs/logger";
import type {
  AgentX,
  AgentXConfig,
  MaybeAsync,
  PendingRequest,
  AgentCreateResponse,
  AgentGetResponse,
  AgentListResponse,
  ImageCreateResponse,
  ImageGetResponse,
  ImageListResponse,
  ContainerCreateResponse,
  ContainerGetResponse,
  ContainerListResponse,
  MessageSendResponse,
  BaseResponse,
} from "./types";

const logger = createLogger("agentx/RemoteClient");

/**
 * Resolve MaybeAsync value
 */
async function resolveValue<T>(value: MaybeAsync<T> | undefined): Promise<T | undefined> {
  if (value === undefined) return undefined;
  if (typeof value === "function") {
    return await (value as () => T | Promise<T>)();
  }
  return value;
}

/**
 * Detect if running in browser
 */
function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.document !== "undefined";
}

/**
 * RemoteClient implementation
 */
export class RemoteClient implements AgentX {
  private readonly config: AgentXConfig;
  private readonly eventBus: EventBus;
  private readonly timeout: number;
  private readonly pendingRequests = new Map<string, PendingRequest>();
  private ws: WebSocket | null = null;
  private _connected = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  constructor(config: AgentXConfig) {
    this.config = config;
    this.eventBus = new EventBusImpl();
    this.timeout = config.timeout ?? 30000;
  }

  // ==================== Properties ====================

  get connected(): boolean {
    return this._connected;
  }

  get events(): EventBus {
    return this.eventBus;
  }

  // ==================== Connection ====================

  async connect(): Promise<void> {
    if (this.disposed) {
      throw new Error("Client has been disposed");
    }

    if (this._connected) {
      return;
    }

    const url = this.config.serverUrl;

    // Create WebSocket
    let ws: WebSocket;
    if (isBrowser()) {
      // Browser WebSocket
      ws = new WebSocket(url);
    } else {
      // Node.js WebSocket - use dynamic import for ESM compatibility
      const { default: WS } = await import("ws");
      ws = new WS(url) as unknown as WebSocket;
    }
    this.ws = ws;

    return new Promise((resolve, reject) => {
      ws.onopen = async () => {
        this._connected = true;
        logger.info("Connected to server", { url });

        // Send auth message in browser (headers not supported)
        if (isBrowser()) {
          const headers = await resolveValue(this.config.headers);
          if (headers) {
            ws.send(JSON.stringify({ type: "auth", headers }));
          }
        }

        resolve();
      };

      ws.onclose = () => {
        this._connected = false;
        logger.info("Disconnected from server");

        // Auto reconnect
        if (!this.disposed && this.config.autoReconnect !== false) {
          this.scheduleReconnect();
        }
      };

      ws.onerror = (err) => {
        logger.error("WebSocket error", { error: err });
        if (!this._connected) {
          reject(new Error("Failed to connect to server"));
        }
      };

      ws.onmessage = (event) => {
        this.handleMessage(event.data as string);
      };
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (!this.disposed && !this._connected) {
        logger.info("Attempting to reconnect...");
        try {
          await this.connect();
        } catch (err) {
          logger.error("Reconnect failed", { error: err });
          this.scheduleReconnect();
        }
      }
    }, 3000);
  }

  private handleMessage(data: string): void {
    try {
      const event = JSON.parse(data) as BusEvent;
      console.log("[RemoteClient] Received message:", event.type, JSON.stringify(event.data));

      // Handle ACK messages
      if (event.type === "__ack") {
        return;
      }

      // Handle message with __msgId (send ACK)
      const eventWithMsgId = event as BusEvent & { __msgId?: string };
      if (eventWithMsgId.__msgId && this.ws) {
        this.ws.send(JSON.stringify({ type: "__ack", __msgId: eventWithMsgId.__msgId }));
      }

      // Check for pending request
      const requestId = (event.data as { requestId?: string })?.requestId;
      if (requestId) {
        const pending = this.pendingRequests.get(requestId);
        if (pending) {
          this.pendingRequests.delete(requestId);
          clearTimeout(pending.timeout);

          const error = (event.data as { error?: string })?.error;
          if (error) {
            pending.reject(new Error(error));
          } else {
            pending.resolve(event);
          }
          return;
        }
      }

      // Emit to event bus
      this.eventBus.emit(event);
    } catch (err) {
      logger.error("Failed to parse message", { error: err });
    }
  }

  private async send(event: BusEvent): Promise<void> {
    if (!this._connected || !this.ws) {
      throw new Error("Not connected to server");
    }

    // Merge context
    const context = await resolveValue(this.config.context);
    if (context) {
      (event as BusEvent & { context?: Record<string, unknown> }).context = context;
    }

    this.ws.send(JSON.stringify(event));
  }

  private async request<T extends BaseResponse>(
    type: string,
    data: Record<string, unknown>
  ): Promise<T> {
    const requestId = generateRequestId();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout: ${type}`));
      }, this.timeout);

      this.pendingRequests.set(requestId, {
        resolve: (event) => resolve(event.data as T),
        reject,
        timeout,
      });

      const event: BusEvent = {
        type,
        timestamp: Date.now(),
        source: "client",
        category: "command",
        intent: "request",
        data: { ...data, requestId },
      };

      this.send(event).catch((err) => {
        this.pendingRequests.delete(requestId);
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  // ==================== Agent Operations ====================

  async createAgent(params: { imageId: string; agentId?: string }): Promise<AgentCreateResponse> {
    return this.request<AgentCreateResponse>("agent_create_request", params);
  }

  async getAgent(agentId: string): Promise<AgentGetResponse> {
    return this.request<AgentGetResponse>("agent_get_request", { agentId });
  }

  async listAgents(containerId?: string): Promise<AgentListResponse> {
    return this.request<AgentListResponse>("agent_list_request", { containerId });
  }

  async destroyAgent(agentId: string): Promise<BaseResponse> {
    return this.request<BaseResponse>("agent_destroy_request", { agentId });
  }

  // ==================== Message Operations ====================

  async sendMessage(agentId: string, content: string | unknown[]): Promise<MessageSendResponse> {
    return this.request<MessageSendResponse>("message_send_request", { agentId, content });
  }

  async interrupt(agentId: string): Promise<BaseResponse> {
    return this.request<BaseResponse>("agent_interrupt_request", { agentId });
  }

  // ==================== Image Operations ====================

  async createImage(params: {
    containerId: string;
    name?: string;
    description?: string;
    systemPrompt?: string;
    mcpServers?: Record<string, unknown>;
  }): Promise<ImageCreateResponse> {
    const response = await this.request<ImageCreateResponse>("image_create_request", params);

    // Auto subscribe to session events
    if (response.__subscriptions) {
      for (const sessionId of response.__subscriptions) {
        this.subscribe(sessionId);
      }
    }

    return response;
  }

  async getImage(imageId: string): Promise<ImageGetResponse> {
    const response = await this.request<ImageGetResponse>("image_get_request", { imageId });

    // Auto subscribe
    if (response.__subscriptions) {
      for (const sessionId of response.__subscriptions) {
        this.subscribe(sessionId);
      }
    }

    return response;
  }

  async listImages(containerId?: string): Promise<ImageListResponse> {
    const response = await this.request<ImageListResponse>("image_list_request", { containerId });

    // Auto subscribe
    if (response.__subscriptions) {
      for (const sessionId of response.__subscriptions) {
        this.subscribe(sessionId);
      }
    }

    return response;
  }

  async deleteImage(imageId: string): Promise<BaseResponse> {
    return this.request<BaseResponse>("image_delete_request", { imageId });
  }

  // ==================== Container Operations ====================

  async createContainer(containerId: string): Promise<ContainerCreateResponse> {
    return this.request<ContainerCreateResponse>("container_create_request", { containerId });
  }

  async getContainer(containerId: string): Promise<ContainerGetResponse> {
    return this.request<ContainerGetResponse>("container_get_request", { containerId });
  }

  async listContainers(): Promise<ContainerListResponse> {
    return this.request<ContainerListResponse>("container_list_request", {});
  }

  // ==================== Event Subscription ====================

  on<T extends string>(type: T, handler: BusEventHandler<BusEvent & { type: T }>): Unsubscribe {
    return this.eventBus.on(type, handler);
  }

  onAny(handler: BusEventHandler): Unsubscribe {
    return this.eventBus.onAny(handler);
  }

  subscribe(sessionId: string): void {
    if (!this._connected || !this.ws) {
      logger.warn("Cannot subscribe: not connected");
      return;
    }

    this.ws.send(JSON.stringify({ type: "subscribe", sessionId }));
    logger.debug("Subscribed to session", { sessionId });
  }

  // ==================== Lifecycle ====================

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this._connected = false;
  }

  async dispose(): Promise<void> {
    this.disposed = true;

    // Reject all pending requests
    for (const [requestId, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Client disposed"));
      this.pendingRequests.delete(requestId);
    }

    await this.disconnect();
    this.eventBus.destroy();

    logger.info("RemoteClient disposed");
  }
}
