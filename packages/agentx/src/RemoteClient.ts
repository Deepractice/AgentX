/**
 * RemoteClient - AgentX client for remote server
 *
 * Uses RpcClient from @agentxjs/core/network for JSON-RPC communication.
 * This class focuses on business logic, not protocol details.
 */

import type { BusEvent, EventBus, BusEventHandler, Unsubscribe } from "@agentxjs/core/event";
import { EventBusImpl } from "@agentxjs/core/event";
import { RpcClient, type RpcMethod } from "@agentxjs/core/network";
import { createLogger } from "commonxjs/logger";
import type {
  AgentX,
  AgentXConfig,
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
 * RemoteClient implementation using JSON-RPC 2.0
 */
export class RemoteClient implements AgentX {
  private readonly config: AgentXConfig;
  private readonly eventBus: EventBus;
  private readonly rpcClient: RpcClient;

  constructor(config: AgentXConfig) {
    this.config = config;
    this.eventBus = new EventBusImpl();

    // Create RPC client
    this.rpcClient = new RpcClient({
      url: config.serverUrl,
      timeout: config.timeout ?? 30000,
      autoReconnect: config.autoReconnect ?? true,
      headers: config.headers as Record<string, string> | undefined,
      debug: false,
    });

    // Forward stream events to internal event bus
    this.rpcClient.onStreamEvent((topic, event) => {
      logger.debug("Received stream event", { topic, type: event.type });
      this.eventBus.emit(event as BusEvent);
    });
  }

  // ==================== Properties ====================

  get connected(): boolean {
    return this.rpcClient.connected;
  }

  get events(): EventBus {
    return this.eventBus;
  }

  // ==================== Connection ====================

  async connect(): Promise<void> {
    await this.rpcClient.connect();
    logger.info("Connected to server", { url: this.config.serverUrl });
  }

  async disconnect(): Promise<void> {
    this.rpcClient.disconnect();
    logger.info("Disconnected from server");
  }

  async dispose(): Promise<void> {
    this.rpcClient.dispose();
    this.eventBus.destroy();
    logger.info("RemoteClient disposed");
  }

  // ==================== Container Operations ====================

  async createContainer(containerId: string): Promise<ContainerCreateResponse> {
    const result = await this.rpcClient.call<ContainerCreateResponse>("container.create", {
      containerId,
    });
    return { ...result, requestId: "" };
  }

  async getContainer(containerId: string): Promise<ContainerGetResponse> {
    const result = await this.rpcClient.call<ContainerGetResponse>("container.get", {
      containerId,
    });
    return { ...result, requestId: "" };
  }

  async listContainers(): Promise<ContainerListResponse> {
    const result = await this.rpcClient.call<ContainerListResponse>("container.list", {});
    return { ...result, requestId: "" };
  }

  // ==================== Image Operations ====================

  async createImage(params: {
    containerId: string;
    name?: string;
    description?: string;
    systemPrompt?: string;
    mcpServers?: Record<string, unknown>;
  }): Promise<ImageCreateResponse> {
    const result = await this.rpcClient.call<ImageCreateResponse>("image.create", params);

    // Auto subscribe to session events
    if (result.__subscriptions) {
      for (const sessionId of result.__subscriptions) {
        this.subscribe(sessionId);
      }
    }

    return { ...result, requestId: "" };
  }

  async getImage(imageId: string): Promise<ImageGetResponse> {
    const result = await this.rpcClient.call<ImageGetResponse>("image.get", { imageId });

    // Auto subscribe
    if (result.__subscriptions) {
      for (const sessionId of result.__subscriptions) {
        this.subscribe(sessionId);
      }
    }

    return { ...result, requestId: "" };
  }

  async listImages(containerId?: string): Promise<ImageListResponse> {
    const result = await this.rpcClient.call<ImageListResponse>("image.list", { containerId });

    // Auto subscribe
    if (result.__subscriptions) {
      for (const sessionId of result.__subscriptions) {
        this.subscribe(sessionId);
      }
    }

    return { ...result, requestId: "" };
  }

  async deleteImage(imageId: string): Promise<BaseResponse> {
    const result = await this.rpcClient.call<BaseResponse>("image.delete", { imageId });
    return { ...result, requestId: "" };
  }

  // ==================== Agent Operations ====================

  async createAgent(params: { imageId: string; agentId?: string }): Promise<AgentCreateResponse> {
    // Agent creation via image.run RPC
    const result = await this.rpcClient.call<AgentCreateResponse>("image.run" as RpcMethod, {
      imageId: params.imageId,
      agentId: params.agentId,
    });
    return { ...result, requestId: "" };
  }

  async getAgent(agentId: string): Promise<AgentGetResponse> {
    const result = await this.rpcClient.call<AgentGetResponse>("agent.get", { agentId });
    return { ...result, requestId: "" };
  }

  async listAgents(containerId?: string): Promise<AgentListResponse> {
    const result = await this.rpcClient.call<AgentListResponse>("agent.list", { containerId });
    return { ...result, requestId: "" };
  }

  async destroyAgent(agentId: string): Promise<BaseResponse> {
    const result = await this.rpcClient.call<BaseResponse>("agent.destroy", { agentId });
    return { ...result, requestId: "" };
  }

  // ==================== Message Operations ====================

  async sendMessage(agentId: string, content: string | unknown[]): Promise<MessageSendResponse> {
    const result = await this.rpcClient.call<MessageSendResponse>("message.send", {
      agentId,
      content,
    });
    return { ...result, requestId: "" };
  }

  async interrupt(agentId: string): Promise<BaseResponse> {
    const result = await this.rpcClient.call<BaseResponse>("agent.interrupt", { agentId });
    return { ...result, requestId: "" };
  }

  // ==================== Event Subscription ====================

  on<T extends string>(type: T, handler: BusEventHandler<BusEvent & { type: T }>): Unsubscribe {
    return this.eventBus.on(type, handler);
  }

  onAny(handler: BusEventHandler): Unsubscribe {
    return this.eventBus.onAny(handler);
  }

  subscribe(sessionId: string): void {
    this.rpcClient.subscribe(sessionId);
    logger.debug("Subscribed to session", { sessionId });
  }
}
