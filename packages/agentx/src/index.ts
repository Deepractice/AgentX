/**
 * agentxjs - AgentX Client SDK
 *
 * Unified entry point supporting local and remote modes.
 *
 * @example Local mode (embedded runtime)
 * ```typescript
 * import { createAgentX } from "agentxjs";
 *
 * const agentx = await createAgentX({
 *   apiKey: process.env.ANTHROPIC_API_KEY,
 *   provider: "anthropic",
 * });
 *
 * await agentx.containers.create("my-app");
 * const { record: image } = await agentx.images.create({
 *   containerId: "my-app",
 *   systemPrompt: "You are helpful",
 * });
 * const { agentId } = await agentx.agents.create({ imageId: image.imageId });
 *
 * agentx.on("text_delta", (e) => process.stdout.write(e.data.text));
 * await agentx.sessions.send(agentId, "Hello!");
 * ```
 *
 * @example Remote mode (WebSocket client)
 * ```typescript
 * import { createAgentX } from "agentxjs";
 *
 * const agentx = await createAgentX({
 *   serverUrl: "ws://localhost:5200",
 * });
 * ```
 */

import { LocalClient } from "./LocalClient";
import { RemoteClient } from "./RemoteClient";
import type { AgentX, AgentXConfig } from "./types";

/**
 * Create an AgentX client
 *
 * Mode detection:
 * - `serverUrl` present → **Remote mode** (WebSocket client)
 * - `apiKey` present → **Local mode** (embedded Runtime + MonoDriver)
 *
 * @param config - Client configuration
 * @returns Connected AgentX client
 */
export async function createAgentX(config: AgentXConfig): Promise<AgentX> {
  if (config.serverUrl) {
    // Remote mode — resolve platform for WebSocket factory if needed
    const resolvedConfig = await resolvePlatformForRemote(config);
    const client = new RemoteClient(resolvedConfig);
    await client.connect();
    return client;
  }

  if (config.apiKey || config.createDriver || config.customPlatform) {
    // Local mode
    return createLocalClient(config);
  }

  throw new Error(
    "Invalid AgentX config: provide either 'serverUrl' (remote mode) or 'apiKey' (local mode)"
  );
}

/**
 * Resolve platform for remote mode
 *
 * In Node.js: auto-import node-platform to get webSocketFactory
 * In browser: no platform needed (native WebSocket is the default)
 */
async function resolvePlatformForRemote(config: AgentXConfig): Promise<AgentXConfig> {
  if (config.customPlatform?.webSocketFactory) {
    return config;
  }

  // In browser, native WebSocket works — no platform needed
  if (typeof globalThis !== "undefined" && (globalThis as any).window?.document !== undefined) {
    return config;
  }

  // Node.js — auto-resolve webSocketFactory from node-platform
  try {
    const { createNodeWebSocket } = await import("@agentxjs/node-platform/network");
    return {
      ...config,
      customPlatform: {
        ...config.customPlatform,
        webSocketFactory: createNodeWebSocket,
      } as any,
    };
  } catch {
    // node-platform not available, fall back to global WebSocket
    return config;
  }
}

/**
 * Create a local client with embedded runtime
 */
async function createLocalClient(config: AgentXConfig): Promise<AgentX> {
  const { createAgentXRuntime } = await import("@agentxjs/core/runtime");

  // Resolve platform
  let platform;
  if (config.customPlatform) {
    platform = config.customPlatform;
  } else {
    const { createNodePlatform } = await import("@agentxjs/node-platform");
    platform = await createNodePlatform({
      dataPath: config.dataPath ?? ":memory:",
      logLevel: config.logLevel ?? (config.debug ? "debug" : undefined),
    });
  }

  // Resolve createDriver
  let createDriver = config.createDriver;
  if (!createDriver) {
    const { createMonoDriver } = await import("@agentxjs/mono-driver");
    createDriver = (driverConfig: import("@agentxjs/core/driver").DriverConfig) => {
      const existingOptions = (driverConfig as any).options ?? {};
      return createMonoDriver({
        ...driverConfig,
        apiKey: config.apiKey ?? driverConfig.apiKey,
        baseUrl: config.baseUrl ?? driverConfig.baseUrl,
        model: config.model ?? driverConfig.model,
        options: {
          ...existingOptions,
          provider: config.provider ?? existingOptions.provider ?? "anthropic",
        },
      });
    };
  }

  // Create runtime
  const runtime = createAgentXRuntime(platform, createDriver);

  return new LocalClient(runtime);
}

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
// Re-export types
export type {
  AgentCreateResponse,
  AgentGetResponse,
  AgentInfo,
  AgentListResponse,
  AgentNamespace,
  AgentX,
  AgentXConfig,
  BaseResponse,
  ContainerCreateResponse,
  ContainerGetResponse,
  ContainerInfo,
  ContainerListResponse,
  ContainerNamespace,
  ImageCreateResponse,
  ImageGetResponse,
  ImageListResponse,
  ImageNamespace,
  ImageRecord,
  LLMProvider,
  MaybeAsync,
  MessageSendResponse,
  PresentationNamespace,
  SessionNamespace,
} from "./types";
