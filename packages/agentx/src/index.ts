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
 * const agent = await ax.chat.create({ name: "Aristotle", model: "claude-sonnet-4-6" });
 * await agent.send("Hello!");
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
import { createLogger } from "@deepracticex/logger";
import { AgentXClient } from "./AgentXClient";
import type { AgentX, AgentXBuilder, AgentXServer, ConnectOptions, ServeConfig } from "./types";

const poolLogger = createLogger("agentx/connection-pool");

// ============================================================================
// Connection Pool — module-level singleton for WebSocket connection reuse
//
// Solves React 18+ Strict Mode double-mount:
//   mount → connect (refCount=1) → unmount → dispose (refCount=0, deferred)
//   → re-mount → connect (reuse, refCount=1)
// ============================================================================

interface PoolEntry {
  client: AgentXClient;
  refCount: number;
}

const connectionPool = new Map<string, PoolEntry>();

function pooledConnect(serverUrl: string, factory: () => Promise<AgentXClient>): Promise<AgentX> {
  const existing = connectionPool.get(serverUrl);
  if (existing && existing.client.connected) {
    existing.refCount++;
    poolLogger.debug("Connection reused", { serverUrl, refCount: existing.refCount });
    return Promise.resolve(wrapWithRefCount(serverUrl, existing));
  }

  return factory().then((client) => {
    const entry: PoolEntry = { client, refCount: 1 };
    connectionPool.set(serverUrl, entry);
    poolLogger.debug("Connection created", { serverUrl });
    return wrapWithRefCount(serverUrl, entry);
  });
}

function wrapWithRefCount(serverUrl: string, entry: PoolEntry): AgentX {
  const client = entry.client;
  const originalDispose = client.dispose.bind(client);
  const originalDisconnect = client.disconnect.bind(client);

  // Override dispose — only truly dispose when refCount reaches 0
  client.dispose = async () => {
    entry.refCount--;
    poolLogger.debug("Connection released", { serverUrl, refCount: entry.refCount });
    if (entry.refCount <= 0) {
      connectionPool.delete(serverUrl);
      await originalDispose();
    }
  };

  // disconnect follows same refCount logic
  client.disconnect = async () => {
    entry.refCount--;
    if (entry.refCount <= 0) {
      connectionPool.delete(serverUrl);
      await originalDisconnect();
    }
  };

  return client;
}

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
  let localClient: AgentXClient | null = null;

  function getLocalClient(): AgentXClient {
    if (localClient) return localClient;
    if (!config) {
      throw new Error(
        "Local mode requires a platform. Pass a PlatformConfig to createAgentX(), or use connect() for remote mode."
      );
    }
    const runtime = createAgentXRuntime(config.platform, config.createDriver);
    localClient = AgentXClient.local(runtime);
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

    get chat() {
      return getLocalClient().chat;
    },

    get present() {
      return getLocalClient().present;
    },

    on(type, handler) {
      return getLocalClient().on(type, handler);
    },

    onAny(handler) {
      return getLocalClient().onAny(handler);
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
      return pooledConnect(serverUrl, async () => {
        const client = AgentXClient.remote({
          serverUrl,
          headers: options?.headers as Record<string, string> | undefined,
          context: options?.context,
          timeout: options?.timeout,
          autoReconnect: options?.autoReconnect,
          customPlatform: config?.platform,
        });
        await client.connect();
        return client;
      });
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

    rpcMethods() {
      return getLocalClient().rpcMethods();
    },
  };
}

// Re-export context interfaces
export type { Capability, Context, ContextProvider } from "@agentxjs/core/context";
// Re-export driver types
export type { SendOptions } from "@agentxjs/core/driver";
// Re-export error types
export type { AgentXErrorCategory, AgentXErrorContext } from "@agentxjs/core/error";
export { AgentXError, AgentXErrorCode } from "@agentxjs/core/error";
// Re-export Presentation
export type {
  AssistantConversation,
  Block,
  Conversation,
  ErrorConversation,
  FileBlock,
  FileTreeEntry,
  ImageBlock,
  OS,
  OSState,
  PresentationMetrics,
  PresentationOptions,
  PresentationOS,
  PresentationState,
  TextBlock,
  ThinkingBlock,
  ToolBlock,
  UserConversation,
} from "./presentation";
export {
  addUserConversation,
  createInitialState,
  initialMetrics,
  initialPresentationState,
  messagesToConversations,
  Presentation,
  presentationReducer,
} from "./presentation";
// Re-export RPC
export type { RpcMethodSchema, RpcProtocol, RpcResponse, RpcHandler } from "@deepracticex/rpc";
export { RpcHandlerRegistry, ok, err, ErrorCodes } from "@deepracticex/rpc";
export { protocol } from "./protocol";
// Re-export types
export type {
  AgentConfig,
  AgentHandle,
  AgentX,
  AgentXBuilder,
  AgentXServer,
  BaseResponse,
  ChatNamespace,
  ConnectOptions,
  ImageRecord,
  PresentationNamespace,
  ServeConfig,
} from "./types";
