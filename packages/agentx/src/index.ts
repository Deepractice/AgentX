/**
 * agentxjs - AgentX Client SDK
 *
 * Fluent API supporting local, remote, and server modes.
 *
 * @example Local mode
 * ```typescript
 * import { createAgentX } from "agentxjs";
 * import { nodePlatform } from "@agentxjs/node-platform";
 *
 * const ax = createAgentX(nodePlatform({ createDriver }));
 * await ax.agent.create({ imageId: "..." });
 * ```
 *
 * @example Remote mode
 * ```typescript
 * const ax = createAgentX();
 * const client = await ax.connect("ws://localhost:5200");
 * ```
 *
 * @example Server mode
 * ```typescript
 * const ax = createAgentX(nodePlatform({ createDriver }));
 * const server = await ax.serve({ port: 5200 });
 * ```
 */

import type { CreateDriver } from "@agentxjs/core/driver";
import type { AgentXPlatform } from "@agentxjs/core/runtime";
import { createAgentXRuntime } from "@agentxjs/core/runtime";
import { LocalClient } from "./LocalClient";
import { RemoteClient } from "./RemoteClient";
import type { AgentX, AgentXBuilder, AgentXServer, ConnectOptions, ServeConfig } from "./types";

/**
 * Platform configuration for createAgentX
 */
export interface PlatformConfig {
  platform: AgentXPlatform;
  createDriver: CreateDriver;
}

/**
 * Create an AgentX builder
 *
 * @param config - Platform configuration (optional). Without it, only connect() is available.
 * @returns AgentXBuilder — local AgentX + connect() + serve()
 */
export function createAgentX(config?: PlatformConfig): AgentXBuilder {
  let localClient: LocalClient | null = null;

  function getLocalClient(): LocalClient {
    if (localClient) return localClient;
    if (!config) {
      throw new Error(
        "Local mode requires a platform. Pass a PlatformConfig to createAgentX(), or use connect() for remote mode."
      );
    }
    const runtime = createAgentXRuntime(config.platform, config.createDriver);
    localClient = new LocalClient(runtime);
    return localClient;
  }

  if (config) {
    getLocalClient();
  }

  return {
    get connected() {
      return localClient?.connected ?? false;
    },

    get events() {
      return getLocalClient().events;
    },

    get container() {
      return getLocalClient().container;
    },

    get image() {
      return getLocalClient().image;
    },

    get agent() {
      return getLocalClient().agent;
    },

    get session() {
      return getLocalClient().session;
    },

    get presentation() {
      return getLocalClient().presentation;
    },

    get llm() {
      return getLocalClient().llm;
    },

    on(type, handler) {
      return getLocalClient().on(type, handler);
    },

    onAny(handler) {
      return getLocalClient().onAny(handler);
    },

    subscribe(sessionId) {
      getLocalClient().subscribe(sessionId);
    },

    onError(handler) {
      return getLocalClient().onError(handler);
    },

    async disconnect() {
      await localClient?.disconnect();
    },

    async dispose() {
      await localClient?.dispose();
      localClient = null;
    },

    async connect(serverUrl: string, options?: ConnectOptions): Promise<AgentX> {
      const remoteClient = new RemoteClient({
        serverUrl,
        headers: options?.headers as Record<string, string> | undefined,
        context: options?.context,
        timeout: options?.timeout,
        autoReconnect: options?.autoReconnect,
        customPlatform: config?.platform,
      });
      await remoteClient.connect();
      return remoteClient;
    },

    async serve(serveConfig?: ServeConfig): Promise<AgentXServer> {
      if (!config) {
        throw new Error("serve() requires a platform. Pass a PlatformConfig to createAgentX().");
      }
      if (!config.platform.channelServer) {
        throw new Error(
          "serve() requires platform.channelServer. Ensure your platform supports server mode."
        );
      }

      const { createServer } = await import("./server");
      return createServer({
        platform: config.platform,
        createDriver: config.createDriver,
        port: serveConfig?.port,
        host: serveConfig?.host,
        server: serveConfig?.server as any,
        wsPath: serveConfig?.wsPath,
      });
    },

    async rpc<T = unknown>(method: string, params?: unknown): Promise<T> {
      return getLocalClient().rpc<T>(method, params);
    },
  };
}

export type { AgentXErrorCategory, AgentXErrorContext } from "@agentxjs/core/error";
// Re-export error types
export { AgentXError, AgentXErrorCode } from "@agentxjs/core/error";
// Re-export server
export { CommandHandler } from "./CommandHandler";
// Re-export Presentation types and classes
export type {
  AssistantConversation,
  Block,
  Conversation,
  ErrorConversation,
  ImageBlock,
  PresentationErrorHandler,
  PresentationOptions,
  PresentationState,
  PresentationUpdateHandler,
  TextBlock,
  ToolBlock,
  UserConversation,
} from "./presentation";
export {
  addUserConversation,
  createInitialState,
  initialPresentationState,
  messagesToConversations,
  Presentation,
  presentationReducer,
} from "./presentation";
export { createServer, type ServerConfig } from "./server";
// Re-export types
export type {
  AgentCreateResponse,
  AgentGetResponse,
  AgentInfo,
  AgentListResponse,
  AgentNamespace,
  AgentX,
  AgentXBuilder,
  AgentXServer,
  BaseResponse,
  ConnectOptions,
  ContainerCreateResponse,
  ContainerGetResponse,
  ContainerInfo,
  ContainerListResponse,
  ContainerNamespace,
  Embodiment,
  ImageCreateResponse,
  ImageGetResponse,
  ImageListResponse,
  ImageNamespace,
  ImageRecord,
  LLMNamespace,
  LLMProviderCreateResponse,
  LLMProviderDefaultResponse,
  LLMProviderGetResponse,
  LLMProviderListResponse,
  LLMProviderUpdateResponse,
  MaybeAsync,
  MessageSendResponse,
  PresentationNamespace,
  ServeConfig,
  SessionNamespace,
} from "./types";
