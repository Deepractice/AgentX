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

import { RemoteClient } from "./RemoteClient";
import { LocalClient } from "./LocalClient";
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
    // Remote mode
    const client = new RemoteClient(config);
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

// Re-export types
export type {
  AgentX,
  AgentXConfig,
  LLMProvider,
  MaybeAsync,
  AgentInfo,
  ImageRecord,
  ContainerInfo,
  ContainerNamespace,
  ImageNamespace,
  AgentNamespace,
  SessionNamespace,
  PresentationNamespace,
  AgentCreateResponse,
  AgentGetResponse,
  AgentListResponse,
  ImageCreateResponse,
  ImageGetResponse,
  ImageListResponse,
  ContainerCreateResponse,
  ContainerGetResponse,
  ContainerListResponse,
  MessageSendResponse,
  BaseResponse,
} from "./types";

// Re-export Presentation types and classes
export type {
  Block,
  TextBlock,
  ToolBlock,
  ImageBlock,
  Conversation,
  UserConversation,
  AssistantConversation,
  ErrorConversation,
  PresentationState,
  PresentationOptions,
  PresentationUpdateHandler,
  PresentationErrorHandler,
} from "./presentation";

export {
  Presentation,
  presentationReducer,
  addUserConversation,
  createInitialState,
  initialPresentationState,
} from "./presentation";
