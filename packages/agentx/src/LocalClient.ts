/**
 * LocalClient - AgentX client for local mode
 *
 * Runs an embedded Runtime + Driver directly, without WebSocket.
 * Implements the same AgentX interface as RemoteClient.
 */

import type { BusEvent, BusEventHandler, EventBus, Unsubscribe } from "@agentxjs/core/event";
import type { AgentXRuntime } from "@agentxjs/core/runtime";
import { createLogger } from "commonxjs/logger";
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
  private isDisposed = false;

  readonly containers: ContainerNamespace;
  readonly images: ImageNamespace;
  readonly agents: AgentNamespace;
  readonly sessions: SessionNamespace;
  readonly presentations: PresentationNamespace;

  constructor(runtime: AgentXRuntime) {
    this.runtime = runtime;
    const platform = runtime.platform;

    this.containers = createLocalContainers(platform);
    this.images = createLocalImages(platform);
    this.agents = createLocalAgents(runtime);
    this.sessions = createLocalSessions(runtime);
    this.presentations = createPresentations(this);

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
