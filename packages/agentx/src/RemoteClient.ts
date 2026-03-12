/**
 * RemoteClient - AgentX client for remote server
 *
 * Uses RpcClient from @agentxjs/core/network for JSON-RPC communication.
 * This class focuses on business logic, not protocol details.
 */

import type { AgentXError } from "@agentxjs/core/error";
import type { BusEvent, BusEventHandler, EventBus, Unsubscribe } from "@agentxjs/core/event";
import { EventBusImpl } from "@agentxjs/core/event";
import { RpcClient, type RpcMethod } from "@agentxjs/core/network";
import { createLogger } from "commonxjs/logger";
import { createRemoteAgents } from "./namespaces/agents";
import { createRemoteContainers } from "./namespaces/containers";
import { createRemoteImages } from "./namespaces/images";
import { createRemoteLLM } from "./namespaces/llm";
import { createPresentations } from "./namespaces/presentations";
import { createRemoteSessions } from "./namespaces/sessions";
import type {
  AgentNamespace,
  AgentX,
  ContainerNamespace,
  ImageNamespace,
  LLMNamespace,
  PresentationNamespace,
  RemoteClientConfig,
  SessionNamespace,
} from "./types";

const logger = createLogger("agentx/RemoteClient");

/**
 * RemoteClient implementation using JSON-RPC 2.0
 */
export class RemoteClient implements AgentX {
  private readonly config: RemoteClientConfig;
  private readonly eventBus: EventBus;
  private readonly rpcClient: RpcClient;

  readonly container: ContainerNamespace;
  readonly image: ImageNamespace;
  readonly agent: AgentNamespace;
  readonly session: SessionNamespace;
  readonly presentation: PresentationNamespace;
  readonly llm: LLMNamespace;

  constructor(config: RemoteClientConfig) {
    this.config = config;
    this.eventBus = new EventBusImpl();

    // Create RPC client (WebSocket factory from platform if available)
    this.rpcClient = new RpcClient({
      url: config.serverUrl,
      createWebSocket: config.customPlatform?.channelClient,
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
    this.container = createRemoteContainers(this.rpcClient);
    this.image = createRemoteImages(this.rpcClient, (sessionId) => this.subscribe(sessionId));
    this.agent = createRemoteAgents(this.rpcClient);
    this.session = createRemoteSessions(this.rpcClient);
    this.presentation = createPresentations(this);
    this.llm = createRemoteLLM(this.rpcClient);
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

  // ==================== Error Handling ====================

  onError(handler: (error: AgentXError) => void): Unsubscribe {
    return this.eventBus.on("agentx_error", (event) => {
      handler(event.data as AgentXError);
    });
  }

  // ==================== RPC ====================

  async rpc<T = unknown>(method: string, params?: unknown): Promise<T> {
    return this.rpcClient.call<T>(method as RpcMethod, params);
  }
}
