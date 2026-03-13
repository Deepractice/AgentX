/**
 * LocalClient - AgentX client for local mode
 *
 * Runs an embedded Runtime + Driver directly, without WebSocket.
 * Implements the same AgentX interface as RemoteClient.
 */

import type { AgentXError } from "@agentxjs/core/error";
import type { BusEvent, BusEventHandler, EventBus, Unsubscribe } from "@agentxjs/core/event";
import type { RpcMethod } from "@agentxjs/core/network";
import type { AgentXRuntime } from "@agentxjs/core/runtime";
import { createLogger } from "commonxjs/logger";
import { AgentHandleImpl } from "./AgentHandle";
import { CommandHandler } from "./CommandHandler";
import { createLocalAgents } from "./namespaces/agents";
import { createLocalContainers } from "./namespaces/containers";
import { createLocalImages } from "./namespaces/images";
import { createLocalLLM } from "./namespaces/llm";
import { createPresentations } from "./namespaces/presentations";
import { createLocalSessions } from "./namespaces/sessions";
import type {
  AgentHandle,
  AgentX,
  Embodiment,
  ImageListResponse,
  InstanceNamespace,
  LLMNamespace,
} from "./types";

const logger = createLogger("agentx/LocalClient");

/**
 * LocalClient - Embedded runtime implementation
 */
export class LocalClient implements AgentX {
  private readonly runtime: AgentXRuntime;
  private commandHandler: CommandHandler | null = null;
  private isDisposed = false;

  readonly instance: InstanceNamespace;
  readonly provider: LLMNamespace;

  constructor(runtime: AgentXRuntime) {
    this.runtime = runtime;
    const platform = runtime.platform;

    const container = createLocalContainers(platform);
    const image = createLocalImages(platform);
    const agent = createLocalAgents(runtime);
    const session = createLocalSessions(runtime);
    const llm = createLocalLLM(platform);
    const present = createPresentations(this, image);

    this.instance = { container, image, agent, session, present, llm };
    this.provider = llm;

    logger.info("LocalClient initialized");
  }

  // ==================== Properties ====================

  get connected(): boolean {
    return !this.isDisposed;
  }

  get events(): EventBus {
    return this.runtime.platform.eventBus;
  }

  // ==================== Top-level Agent API ====================

  async create(params: {
    name?: string;
    description?: string;
    contextId?: string;
    embody?: Embodiment;
    customData?: Record<string, unknown>;
  }): Promise<AgentHandle> {
    const containerId = "default";
    const imgRes = await this.instance.image.create({ containerId, ...params });
    const agentRes = await this.instance.agent.create({ imageId: imgRes.record.imageId });
    return new AgentHandleImpl(
      {
        agentId: agentRes.agentId,
        imageId: agentRes.imageId,
        containerId: agentRes.containerId,
        sessionId: agentRes.sessionId,
      },
      this.instance
    );
  }

  async list(): Promise<ImageListResponse> {
    return this.instance.image.list();
  }

  async get(agentId: string): Promise<AgentHandle | null> {
    const res = await this.instance.image.get(agentId);
    if (!res.record) return null;
    const r = res.record;
    return new AgentHandleImpl(
      {
        agentId: r.imageId,
        imageId: r.imageId,
        containerId: r.containerId,
        sessionId: r.sessionId,
      },
      this.instance
    );
  }

  // ==================== Event Subscription ====================

  on<T extends string>(type: T, handler: BusEventHandler<BusEvent & { type: T }>): Unsubscribe {
    return this.runtime.platform.eventBus.on(type, handler);
  }

  onAny(handler: BusEventHandler): Unsubscribe {
    return this.runtime.platform.eventBus.onAny(handler);
  }

  subscribe(_sessionId: string): void {
    // No-op for local mode - already subscribed via eventBus
  }

  // ==================== Error Handling ====================

  onError(handler: (error: AgentXError) => void): Unsubscribe {
    return this.runtime.platform.eventBus.on("agentx_error", (event) => {
      handler(event.data as AgentXError);
    });
  }

  // ==================== RPC ====================

  async rpc<T = unknown>(method: string, params?: unknown): Promise<T> {
    if (!this.commandHandler) {
      this.commandHandler = new CommandHandler(this.runtime);
    }
    const result = await this.commandHandler.handle(method as RpcMethod, params);
    if (result.success) {
      return result.data as T;
    }
    throw new Error(result.message);
  }

  // ==================== Lifecycle ====================

  async disconnect(): Promise<void> {
    // No-op for local mode
  }

  async dispose(): Promise<void> {
    if (this.isDisposed) return;
    await this.runtime.shutdown();
    this.isDisposed = true;
    logger.info("LocalClient disposed");
  }
}
