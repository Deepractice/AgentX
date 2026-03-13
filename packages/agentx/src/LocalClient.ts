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
import { createLocalInstances } from "./namespaces/agents";
import { createLocalImages } from "./namespaces/images";
import { createLocalLLM } from "./namespaces/llm";
import { createPresentations } from "./namespaces/presentations";
import { createLocalPrototypes } from "./namespaces/prototypes";
import { createLocalSessions } from "./namespaces/sessions";
import type {
  AgentX,
  ChatNamespace,
  LLMNamespace,
  PrototypeNamespace,
  RuntimeNamespace,
} from "./types";

const logger = createLogger("agentx/LocalClient");

/**
 * LocalClient - Embedded runtime implementation
 */
export class LocalClient implements AgentX {
  private readonly _runtime: AgentXRuntime;
  private commandHandler: CommandHandler | null = null;
  private isDisposed = false;

  readonly chat: ChatNamespace;
  readonly runtime: RuntimeNamespace;
  readonly provider: LLMNamespace;
  readonly prototype: PrototypeNamespace;

  constructor(agentxRuntime: AgentXRuntime) {
    this._runtime = agentxRuntime;
    const platform = agentxRuntime.platform;

    const image = createLocalImages(platform);
    const instance = createLocalInstances(agentxRuntime);
    const session = createLocalSessions(agentxRuntime);
    const llm = createLocalLLM(platform);
    const prototype = createLocalPrototypes(platform);
    const present = createPresentations(this, session);

    this.runtime = { image, instance, session, present, llm, prototype };
    this.provider = llm;
    this.prototype = prototype;
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

  subscribe(_sessionId: string): void {
    // No-op for local mode - already subscribed via eventBus
  }

  // ==================== Error Handling ====================

  onError(handler: (error: AgentXError) => void): Unsubscribe {
    return this._runtime.platform.eventBus.on("agentx_error", (event) => {
      handler(event.data as AgentXError);
    });
  }

  // ==================== RPC ====================

  async rpc<T = unknown>(method: string, params?: unknown): Promise<T> {
    if (!this.commandHandler) {
      this.commandHandler = new CommandHandler(this._runtime);
    }
    const result = await this.commandHandler.handle(method as RpcMethod, params);
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
        // If prototypeId is provided, merge prototype config into params
        let mergedParams = { ...params };
        if (params.prototypeId) {
          const protoRes = await rt.prototype.get(params.prototypeId);
          if (protoRes.record) {
            const proto = protoRes.record;
            mergedParams = {
              name: proto.name,
              description: proto.description,
              contextId: proto.contextId,
              embody: proto.embody,
              customData: proto.customData,
              ...params, // inline params override prototype
            };
          }
        }
        const { prototypeId: _pid, ...imageParams } = mergedParams;
        const imgRes = await rt.image.create(imageParams);
        const instRes = await rt.instance.create({ imageId: imgRes.record.imageId });
        return new AgentHandleImpl(
          {
            instanceId: instRes.instanceId,
            imageId: instRes.imageId,
            containerId: instRes.containerId,
            sessionId: instRes.sessionId,
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
        const r = res.record;
        const instRes = await rt.instance.create({ imageId: r.imageId });
        return new AgentHandleImpl(
          {
            instanceId: instRes.instanceId,
            imageId: instRes.imageId,
            containerId: instRes.containerId,
            sessionId: instRes.sessionId,
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
