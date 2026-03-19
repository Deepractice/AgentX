/**
 * AgentXClient — unified client for local and remote modes.
 *
 * Three-layer API:
 *   ax.chat     — high-level: create/list/get agents (simple client)
 *   ax.present  — UI layer: Presentation state management (UI client)
 *   ax.rpc()    — low-level: raw RPC dispatch (platform/advanced)
 */

import type { AgentXError } from "@agentxjs/core/error";
import type { BusEvent, BusEventHandler, EventBus, Unsubscribe } from "@agentxjs/core/event";
import { EventBusImpl } from "@agentxjs/core/event";
import { RpcClient } from "@agentxjs/core/network";
import type { AgentXRuntime } from "@agentxjs/core/runtime";
import { createLogger } from "@deepracticex/logger";
import { AgentHandleImpl } from "./AgentHandle";
import { registerAll } from "./handlers";
import { createPresentations, type OSResolver } from "./namespaces/presentations";
import { RpcHandlerRegistry, type RpcMethodSchema } from "@deepracticex/rpc";
import type {
  AgentX,
  ChatNamespace,
  ImageCreateResponse,
  ImageGetResponse,
  ImageListResponse,
  InstanceCreateResponse,
  PresentationNamespace,
  RemoteClientConfig,
} from "./types";

const logger = createLogger("agentx/AgentXClient");

export class AgentXClient implements AgentX {
  private readonly _engine?: AgentXRuntime;
  private readonly _rpcClient?: RpcClient;
  private _registry?: RpcHandlerRegistry;
  private readonly _eventBus: EventBus;
  private _disposed = false;

  readonly chat: ChatNamespace;
  readonly present: PresentationNamespace;

  static local(engine: AgentXRuntime): AgentXClient {
    return new AgentXClient({ mode: "local", engine });
  }

  static remote(config: RemoteClientConfig): AgentXClient {
    return new AgentXClient({ mode: "remote", config });
  }

  private constructor(
    init: { mode: "local"; engine: AgentXRuntime } | { mode: "remote"; config: RemoteClientConfig }
  ) {
    if (init.mode === "local") {
      this._engine = init.engine;
      this._eventBus = init.engine.platform.eventBus;

      const osResolver: OSResolver = async (imageId) => {
        const platform = init.engine.platform;
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

      const session = {
        send: async (id: string, content: unknown, options?: unknown) => {
          const resolved = id.startsWith("inst_") ? { instanceId: id } : { imageId: id };
          return this.rpc("message.send", { ...resolved, content, options });
        },
        interrupt: async (id: string) => {
          const resolved = id.startsWith("inst_") ? { instanceId: id } : { imageId: id };
          return this.rpc("instance.interrupt", resolved);
        },
        getMessages: async (id: string) => {
          if (id.startsWith("inst_")) {
            const res = await this.rpc<{ agent: { imageId: string } | null }>("instance.get", {
              instanceId: id,
            });
            if (!res.agent) return [];
            id = res.agent.imageId;
          }
          const res = await this.rpc<{ messages: unknown[] }>("image.messages", { imageId: id });
          return (res.messages ?? []) as any;
        },
      };

      this.present = createPresentations(this, session as any, osResolver);
      this.chat = this._createChat();

      logger.info("AgentXClient initialized (local)");
    } else {
      this._eventBus = new EventBusImpl();
      this._rpcClient = new RpcClient({
        url: init.config.serverUrl,
        createWebSocket: init.config.customPlatform?.channelClient,
        timeout: init.config.timeout ?? 30000,
        autoReconnect: init.config.autoReconnect ?? true,
        headers: init.config.headers as Record<string, string> | undefined,
        debug: false,
      });

      this._rpcClient.onStreamEvent((_topic, event) => {
        this._eventBus.emit(event as BusEvent);
      });
      this._rpcClient.onStateChange((state) => {
        this._eventBus.emit({
          type: "connection_state",
          timestamp: Date.now(),
          data: { state },
        } as BusEvent);
      });

      const osResolver: OSResolver = async (imageId) => ({
        read: async (path: string) => {
          const res = await this.rpc<{ content: string }>("os.read", { imageId, path });
          return res.content;
        },
        write: async (path: string, content: string) => {
          await this.rpc("os.write", { imageId, path, content });
        },
        list: async (path?: string) => {
          const res = await this.rpc<{
            files: Array<{ name: string; path: string; type: "file" | "directory" }>;
          }>("os.list", { imageId, path });
          return res.files;
        },
      });

      const session = {
        send: async (id: string, content: unknown, options?: unknown) => {
          const resolved = id.startsWith("inst_") ? { instanceId: id } : { imageId: id };
          return this.rpc("message.send", { ...resolved, content, options });
        },
        interrupt: async (id: string) => {
          const resolved = id.startsWith("inst_") ? { instanceId: id } : { imageId: id };
          return this.rpc("instance.interrupt", resolved);
        },
        getMessages: async (id: string) => {
          if (id.startsWith("inst_")) {
            const res = await this.rpc<{ agent: { imageId: string } | null }>("instance.get", {
              instanceId: id,
            });
            if (!res.agent) return [];
            id = res.agent.imageId;
          }
          const res = await this.rpc<{ messages: unknown[] }>("image.messages", { imageId: id });
          return (res.messages ?? []) as any;
        },
      };

      this.present = createPresentations(this, session as any, osResolver);
      this.chat = this._createChat();

      logger.info("AgentXClient initialized (remote)");
    }
  }

  // ==================== Properties ====================

  get connected(): boolean {
    if (this._rpcClient) return this._rpcClient.connected;
    return !this._disposed;
  }

  get events(): EventBus {
    return this._eventBus;
  }

  // ==================== RPC (low-level) ====================

  async rpc<T = unknown>(method: string, params?: unknown): Promise<T> {
    if (this._rpcClient) {
      return this._rpcClient.call<T>(method, params);
    }
    this._ensureRegistry();
    const result = await this._registry!.handle(this._engine!, method, params);
    if (result.success) return result.data as T;
    throw new Error(result.message);
  }

  rpcMethods(): RpcMethodSchema[] {
    this._ensureRegistry();
    return this._registry!.rpcMethods();
  }

  // ==================== Events ====================

  on<T extends string>(type: T, handler: BusEventHandler<BusEvent & { type: T }>): Unsubscribe {
    return this._eventBus.on(type, handler);
  }

  onAny(handler: BusEventHandler): Unsubscribe {
    return this._eventBus.onAny(handler);
  }

  onError(handler: (error: AgentXError) => void): Unsubscribe {
    return this._eventBus.on("agentx_error", (event) => {
      handler(event.data as AgentXError);
    });
  }

  // ==================== Connection ====================

  async connect(): Promise<void> {
    if (this._rpcClient) await this._rpcClient.connect();
  }

  async disconnect(): Promise<void> {
    if (this._rpcClient) this._rpcClient.disconnect();
  }

  async dispose(): Promise<void> {
    if (this._disposed) return;
    if (this._rpcClient) {
      this._rpcClient.dispose();
      (this._eventBus as EventBusImpl).destroy();
    } else if (this._engine) {
      await this._engine.shutdown();
    }
    this._disposed = true;
  }

  // ==================== Private ====================

  private _ensureRegistry(): void {
    if (!this._registry) {
      this._registry = new RpcHandlerRegistry();
      registerAll(this._registry);
    }
  }

  private _createChat(): ChatNamespace {
    return {
      create: async (params) => {
        const imgRes = await this.rpc<ImageCreateResponse>("image.create", params);
        const runRes = await this.rpc<InstanceCreateResponse>("image.run", {
          imageId: imgRes.record.imageId,
        });
        return new AgentHandleImpl(
          {
            instanceId: runRes.instanceId,
            imageId: runRes.imageId,
            containerId: runRes.containerId,
            sessionId: runRes.sessionId,
          },
          this
        );
      },
      list: async () => {
        return this.rpc<ImageListResponse>("image.list", {});
      },
      get: async (id) => {
        const res = await this.rpc<ImageGetResponse>("image.get", { imageId: id });
        if (!res.record) return null;
        const runRes = await this.rpc<InstanceCreateResponse>("image.run", {
          imageId: res.record.imageId,
        });
        return new AgentHandleImpl(
          {
            instanceId: runRes.instanceId,
            imageId: runRes.imageId,
            containerId: runRes.containerId,
            sessionId: runRes.sessionId,
          },
          this
        );
      },
    };
  }
}
