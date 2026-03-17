/**
 * LocalClient - AgentX client for local mode
 *
 * Runs an embedded Runtime + Driver directly, without WebSocket.
 * Implements the same AgentX interface as RemoteClient.
 */

import type { AgentXError } from "@agentxjs/core/error";
import type { BusEvent, BusEventHandler, EventBus, Unsubscribe } from "@agentxjs/core/event";

import type { AgentXRuntime } from "@agentxjs/core/runtime";
import { createLogger } from "commonxjs/logger";
import { AgentHandleImpl } from "./AgentHandle";
import { registerAll } from "./handlers";
import { createLocalImages } from "./namespaces/images";
import { createLocalLLM } from "./namespaces/llm";
import { createPresentations } from "./namespaces/presentations";
import { createLocalSessions } from "./namespaces/sessions";
import { RpcHandlerRegistry } from "./RpcHandlerRegistry";
import type { AgentX, ChatNamespace, LLMNamespace, RuntimeNamespace } from "./types";

const logger = createLogger("agentx/LocalClient");

/**
 * LocalClient - Embedded runtime implementation
 */
export class LocalClient implements AgentX {
  private readonly _runtime: AgentXRuntime;
  private registry: RpcHandlerRegistry | null = null;
  private isDisposed = false;

  readonly chat: ChatNamespace;
  readonly runtime: RuntimeNamespace;
  readonly provider: LLMNamespace;

  constructor(agentxRuntime: AgentXRuntime) {
    this._runtime = agentxRuntime;
    const platform = agentxRuntime.platform;

    const image = createLocalImages(platform, agentxRuntime);
    const session = createLocalSessions(agentxRuntime);
    const llm = createLocalLLM(platform);
    // OS resolver: imageId → PresentationOS (via AgentOS)
    const osResolver = async (imageId: string) => {
      const op = platform.osProvider;
      if (!op) return null;
      const img = await platform.imageRepository.findImageById(imageId);
      if (!img?.osId) return null;
      const os = await op.create(img.osId);
      return {
        read: (path: string) => os.fs.read(path),
        write: (path: string, content: string) => os.fs.write(path, content),
        list: async (path?: string) => {
          const entries = await os.fs.list(path);
          return entries.map((e) => ({ name: e.name, path: e.path, type: e.type }));
        },
      };
    };
    const present = createPresentations(this, session, osResolver);

    this.runtime = { image, session, present, llm };
    this.provider = llm;
    this.chat = this.createChatNamespace();

    logger.info("LocalClient initialized");
  }

  // ==================== Properties ====================

  get connected(): boolean {
    return !this.isDisposed;
  }

  get events(): EventBus {
    return this._runtime.platform.eventBus;
  }

  // ==================== Event Subscription ====================

  on<T extends string>(type: T, handler: BusEventHandler<BusEvent & { type: T }>): Unsubscribe {
    return this._runtime.platform.eventBus.on(type, handler);
  }

  onAny(handler: BusEventHandler): Unsubscribe {
    return this._runtime.platform.eventBus.onAny(handler);
  }

  // ==================== Error Handling ====================

  onError(handler: (error: AgentXError) => void): Unsubscribe {
    return this._runtime.platform.eventBus.on("agentx_error", (event) => {
      handler(event.data as AgentXError);
    });
  }

  // ==================== RPC ====================

  async rpc<T = unknown>(method: string, params?: unknown): Promise<T> {
    if (!this.registry) {
      this.registry = new RpcHandlerRegistry();
      registerAll(this.registry);
    }
    const result = await this.registry.handle(this._runtime, method, params);
    if (result.success) {
      return result.data as T;
    }
    throw new Error(result.message);
  }

  // ==================== Private ====================

  private createChatNamespace(): ChatNamespace {
    const rt = this.runtime;
    return {
      async create(params) {
        const imgRes = await rt.image.create(params);
        const runRes = await rt.image.run(imgRes.record.imageId);
        return new AgentHandleImpl(
          {
            instanceId: runRes.instanceId,
            imageId: runRes.imageId,
            containerId: runRes.containerId,
            sessionId: runRes.sessionId,
          },
          rt
        );
      },
      async list() {
        return rt.image.list();
      },
      async get(id) {
        const res = await rt.image.get(id);
        if (!res.record) return null;
        const runRes = await rt.image.run(res.record.imageId);
        return new AgentHandleImpl(
          {
            instanceId: runRes.instanceId,
            imageId: runRes.imageId,
            containerId: runRes.containerId,
            sessionId: runRes.sessionId,
          },
          rt
        );
      },
    };
  }

  // ==================== Lifecycle ====================

  async disconnect(): Promise<void> {
    // No-op for local mode
  }

  async dispose(): Promise<void> {
    if (this.isDisposed) return;
    await this._runtime.shutdown();
    this.isDisposed = true;
    logger.info("LocalClient disposed");
  }
}
