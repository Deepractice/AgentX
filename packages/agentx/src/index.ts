/**
 * agentxjs - AgentX Client SDK
 *
 * Connect to AgentX servers from Node.js and browsers.
 *
 * @example
 * ```typescript
 * import { createAgentX } from "agentxjs";
 *
 * // Connect to server
 * const agentx = await createAgentX({
 *   serverUrl: "ws://localhost:5200",
 *   headers: { Authorization: "Bearer sk-xxx" },
 *   context: { userId: "123", tenantId: "abc" },
 * });
 *
 * // Create container and image
 * await agentx.createContainer("my-container");
 * const { record: image } = await agentx.createImage({
 *   containerId: "my-container",
 *   name: "Assistant",
 *   systemPrompt: "You are a helpful assistant",
 * });
 *
 * // Create agent and send message
 * const { agentId } = await agentx.createAgent({ imageId: image.imageId });
 *
 * // Subscribe to events
 * agentx.on("text_delta", (event) => {
 *   process.stdout.write(event.data.text);
 * });
 *
 * agentx.on("assistant_message", (event) => {
 *   console.log("Complete:", event.data.content);
 * });
 *
 * // Send message
 * await agentx.sendMessage(agentId, "Hello!");
 *
 * // Cleanup
 * await agentx.dispose();
 * ```
 *
 * @example Dynamic headers and context
 * ```typescript
 * const agentx = await createAgentX({
 *   serverUrl: "ws://localhost:5200",
 *   headers: () => ({ Authorization: `Bearer ${getToken()}` }),
 *   context: async () => ({
 *     userId: await getUserId(),
 *     permissions: await getPermissions(),
 *   }),
 * });
 * ```
 */

import { RemoteClient } from "./RemoteClient";
import type { AgentX, AgentXConfig } from "./types";

/**
 * Create an AgentX client
 *
 * @param config - Client configuration
 * @returns Connected AgentX client
 */
export async function createAgentX(config: AgentXConfig): Promise<AgentX> {
  const client = new RemoteClient(config);
  await client.connect();
  return client;
}

// Re-export types
export type {
  AgentX,
  AgentXConfig,
  MaybeAsync,
  AgentInfo,
  ImageRecord,
  ContainerInfo,
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

// Re-export RemoteClient for advanced use
export { RemoteClient } from "./RemoteClient";

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
