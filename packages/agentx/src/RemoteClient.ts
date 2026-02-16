/**
 * RemoteClient - AgentX client for remote server
 *
 * Uses RpcClient from @agentxjs/core/network for JSON-RPC communication.
 * This class focuses on business logic, not protocol details.
 */

import type { BusEvent, BusEventHandler, EventBus, Unsubscribe } from "@agentxjs/core/event";
import { EventBusImpl } from "@agentxjs/core/event";
import { RpcClient } from "@agentxjs/core/network";
import { createLogger } from "commonxjs/logger";
import { createRemoteAgents } from "./namespaces/agents";
import { createRemoteContainers } from "./namespaces/containers";
import { createRemoteImages } from "./namespaces/images";
import { createPresentations } from "./namespaces/presentations";
import { createRemoteSessions } from "./namespaces/sessions";
import type {
  AgentNamespace,
  AgentX,
  AgentXConfig,
  ContainerNamespace,
  ImageNamespace,
  PresentationNamespace,
  SessionNamespace,
} from "./types";

const logger = createLogger("agentx/RemoteClient");

/**
 * RemoteClient implementation using JSON-RPC 2.0
 */
export class RemoteClient implements AgentX {
  private readonly config: AgentXConfig;
  private readonly eventBus: EventBus;
  private readonly rpcClient: RpcClient;

  readonly containers: ContainerNamespace;
  readonly images: ImageNamespace;
  readonly agents: AgentNamespace;
  readonly sessions: SessionNamespace;
  readonly presentations: PresentationNamespace;

  constructor(config: AgentXConfig) {
    this.config = config;
    this.eventBus = new EventBusImpl();

    // Create RPC client (WebSocket factory from platform if available)
    this.rpcClient = new RpcClient({
      url: config.serverUrl!,
      createWebSocket: config.customPlatform?.webSocketFactory,
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

    // Assemble namespaces
    this.containers = createRemoteContainers(this.rpcClient);
    this.images = createRemoteImages(this.rpcClient, (sessionId) => this.subscribe(sessionId));
    this.agents = createRemoteAgents(this.rpcClient);
    this.sessions = createRemoteSessions(this.rpcClient);
    this.presentations = createPresentations(this);
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
