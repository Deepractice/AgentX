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
import { CommandHandler } from "./CommandHandler";
import { createLocalAgents } from "./namespaces/agents";
import { createLocalContainers } from "./namespaces/containers";
import { createLocalImages } from "./namespaces/images";
import { createPresentations } from "./namespaces/presentations";
import { createLocalSessions } from "./namespaces/sessions";
import type {
  AgentNamespace,
  AgentX,
  ContainerNamespace,
  ImageNamespace,
  PresentationNamespace,
  SessionNamespace,
} from "./types";

const logger = createLogger("agentx/LocalClient");

/**
 * LocalClient - Embedded runtime implementation
 */
export class LocalClient implements AgentX {
  private readonly runtime: AgentXRuntime;
  private commandHandler: CommandHandler | null = null;
  private isDisposed = false;

  readonly container: ContainerNamespace;
  readonly image: ImageNamespace;
  readonly agent: AgentNamespace;
  readonly session: SessionNamespace;
  readonly presentation: PresentationNamespace;

  constructor(runtime: AgentXRuntime) {
    this.runtime = runtime;
    const platform = runtime.platform;

    this.container = createLocalContainers(platform);
    this.image = createLocalImages(platform);
    this.agent = createLocalAgents(runtime);
    this.session = createLocalSessions(runtime);
    this.presentation = createPresentations(this);

    logger.info("LocalClient initialized");
  }

  // ==================== Properties ====================

  get connected(): boolean {
    return !this.isDisposed;
  }

  get events(): EventBus {
    return this.runtime.platform.eventBus;
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
