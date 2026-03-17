/**
 * AgentX Client SDK Types
 */

import type { Message } from "@agentxjs/core/agent";
import type { AgentXError } from "@agentxjs/core/error";
import type { BusEvent, BusEventHandler, EventBus, Unsubscribe } from "@agentxjs/core/event";
import type { LLMProtocol, LLMProviderRecord } from "@agentxjs/core/persistence";
import type { AgentXPlatform } from "@agentxjs/core/runtime";
import type { Presentation, PresentationOptions } from "./presentation";

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Static or dynamic value
 */
export type MaybeAsync<T> = T | (() => T) | (() => Promise<T>);

/**
 * Internal config passed to RemoteClient
 * @internal
 */
export interface RemoteClientConfig {
  serverUrl: string;
  headers?: MaybeAsync<Record<string, string>>;
  context?: MaybeAsync<Record<string, unknown>>;
  timeout?: number;
  autoReconnect?: boolean;
  customPlatform?: AgentXPlatform;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Agent info returned from server
 */
export interface InstanceInfo {
  instanceId: string;
  imageId: string;
  containerId: string;
  sessionId: string;
  lifecycle?: string;
}

/**
 * AgentConfig — flat runtime configuration for creating an agent.
 * AgentConfig IS the body — no wrapper needed.
 */
export interface AgentConfig {
  /** LLM model identifier */
  model?: string;
  /** System prompt for the agent */
  systemPrompt?: string;
  /** MCP server configurations for tool access */
  mcpServers?: Record<string, unknown>;
  /** Thinking/reasoning depth */
  thinking?: "disabled" | "low" | "medium" | "high";
  /** Provider-specific options — passed directly to Vercel AI SDK */
  providerOptions?: Record<string, unknown>;
  /** Context provider ID (e.g. RoleX individual) */
  contextId?: string;
  /** Display name */
  name?: string;
  /** Description */
  description?: string;
  /** Arbitrary custom data */
  customData?: Record<string, unknown>;
}

/**
 * Image record from server (internal persistence)
 */
export interface ImageRecord {
  imageId: string;
  containerId: string;
  sessionId: string;
  name?: string;
  description?: string;
  contextId?: string;
  model?: string;
  systemPrompt?: string;
  mcpServers?: Record<string, unknown>;
  customData?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

// ============================================================================
// Request/Response Types
// ============================================================================

/**
 * Base response with requestId
 */
export interface BaseResponse {
  requestId: string;
  error?: string;
}

/**
 * Agent create response
 */
export interface InstanceCreateResponse extends BaseResponse {
  instanceId: string;
  imageId: string;
  containerId: string;
  sessionId: string;
}

/**
 * Agent get response
 */
export interface InstanceGetResponse extends BaseResponse {
  agent: InstanceInfo | null;
  exists: boolean;
}

/**
 * Agent list response
 */
export interface InstanceListResponse extends BaseResponse {
  agents: InstanceInfo[];
}

/**
 * Image create response
 */
export interface ImageCreateResponse extends BaseResponse {
  record: ImageRecord;
}

/**
 * Image get response
 */
export interface ImageGetResponse extends BaseResponse {
  record: ImageRecord | null;
}

/**
 * Image list response
 */
export interface ImageListResponse extends BaseResponse {
  records: ImageRecord[];
}

/**
 * Image update response
 */
export interface ImageUpdateResponse extends BaseResponse {
  record: ImageRecord;
}

/**
 * Message send response
 */
export interface MessageSendResponse extends BaseResponse {
  instanceId: string;
}

/**
 * LLM provider create response
 */
export interface LLMProviderCreateResponse extends BaseResponse {
  record: LLMProviderRecord;
}

/**
 * LLM provider get response
 */
export interface LLMProviderGetResponse extends BaseResponse {
  record: LLMProviderRecord | null;
}

/**
 * LLM provider list response
 */
export interface LLMProviderListResponse extends BaseResponse {
  records: LLMProviderRecord[];
}

/**
 * LLM provider update response
 */
export interface LLMProviderUpdateResponse extends BaseResponse {
  record: LLMProviderRecord;
}

/**
 * LLM provider default response
 */
export interface LLMProviderDefaultResponse extends BaseResponse {
  record: LLMProviderRecord | null;
}

// ============================================================================
// Namespace Interfaces
// ============================================================================

/**
 * Image operations namespace
 */
export interface ImageNamespace {
  /**
   * Create a new image from an Agent blueprint
   */
  create(params: AgentConfig): Promise<ImageCreateResponse>;

  /**
   * Get image by ID
   */
  get(imageId: string): Promise<ImageGetResponse>;

  /**
   * List images
   */
  list(): Promise<ImageListResponse>;

  /**
   * Update image
   */
  update(
    imageId: string,
    updates: Partial<
      Pick<
        AgentConfig,
        "name" | "description" | "model" | "systemPrompt" | "mcpServers" | "customData"
      >
    >
  ): Promise<ImageUpdateResponse>;

  /**
   * Delete image
   */
  delete(imageId: string): Promise<BaseResponse>;

  /**
   * Get message history for an image
   */
  getMessages(imageId: string): Promise<Message[]>;

  /**
   * Run an agent from this image.
   * Reuses existing running agent if available.
   */
  run(imageId: string): Promise<InstanceCreateResponse>;

  /**
   * Stop the agent for this image.
   */
  stop(imageId: string): Promise<BaseResponse>;
}

/**
 * Session operations namespace (messaging)
 */
export interface SessionNamespace {
  /**
   * Send message to agent.
   * Accepts imageId (recommended) or instanceId.
   * With imageId, the server auto-creates agent if needed.
   */
  send(imageId: string, content: string | unknown[]): Promise<MessageSendResponse>;

  /**
   * Interrupt agent.
   * Accepts imageId or instanceId.
   */
  interrupt(imageId: string): Promise<BaseResponse>;

  /**
   * Get message history for an agent's session.
   * Accepts imageId or instanceId.
   */
  getMessages(imageId: string): Promise<Message[]>;
}

/**
 * LLM provider operations namespace
 */
export interface LLMNamespace {
  /**
   * Create a new LLM provider configuration
   */
  create(params: {
    name: string;
    vendor: string;
    protocol: LLMProtocol;
    apiKey: string;
    baseUrl?: string;
    model?: string;
  }): Promise<LLMProviderCreateResponse>;

  /**
   * Get LLM provider by ID
   */
  get(id: string): Promise<LLMProviderGetResponse>;

  /**
   * List LLM providers
   */
  list(): Promise<LLMProviderListResponse>;

  /**
   * Update LLM provider
   */
  update(
    id: string,
    updates: {
      name?: string;
      vendor?: string;
      protocol?: LLMProtocol;
      apiKey?: string;
      baseUrl?: string;
      model?: string;
    }
  ): Promise<LLMProviderUpdateResponse>;

  /**
   * Delete LLM provider
   */
  delete(id: string): Promise<BaseResponse>;

  /**
   * Set default LLM provider
   */
  setDefault(id: string): Promise<BaseResponse>;

  /**
   * Get default LLM provider
   */
  getDefault(): Promise<LLMProviderDefaultResponse>;
}

/**
 * Presentation operations namespace
 */
export interface PresentationNamespace {
  /**
   * Create a presentation for UI integration
   *
   * @example
   * ```typescript
   * const pres = ax.present(instanceId, {
   *   onUpdate: (state) => renderUI(state),
   *   onError: (error) => console.error(error),
   * });
   *
   * await pres.send("Hello!");
   * pres.dispose();
   * ```
   */
  create(instanceId: string, options?: PresentationOptions): Promise<Presentation>;
}

// ============================================================================
// Instance Namespace — internal implementation details
// ============================================================================

/**
 * Instance — low-level access to internal subsystems.
 *
 * Most users should use the top-level Agent API (ax.create, ax.send, etc.).
 * Instance exposes the underlying image, agent, session, llm,
 * and presentation subsystems for advanced use cases.
 */
export interface RuntimeNamespace {
  readonly image: ImageNamespace;
  readonly session: SessionNamespace;
  readonly present: PresentationNamespace;
  readonly llm: LLMNamespace;
}

// ============================================================================
// Agent Handle
// ============================================================================

/**
 * AgentHandle — a live reference to a created agent.
 *
 * Returned by `ax.chat.create()` and `ax.chat.get()`. Holds the agent's identity
 * and provides instance-level operations (send, interrupt, etc.).
 *
 * @example
 * ```typescript
 * const agent = await ax.chat.create({ name: "Aristotle", model: "claude-sonnet-4-6" });
 * await agent.send("Hello!");
 * const messages = await agent.history();
 * ```
 */
export interface AgentHandle {
  readonly instanceId: string;
  readonly imageId: string;
  readonly containerId: string;
  readonly sessionId: string;

  /**
   * Send a message to this agent
   */
  send(content: string | unknown[]): Promise<MessageSendResponse>;

  /**
   * Interrupt this agent's current response
   */
  interrupt(): Promise<BaseResponse>;

  /**
   * Get message history
   */
  history(): Promise<Message[]>;

  /**
   * Create a presentation for UI integration
   */
  present(options?: PresentationOptions): Promise<Presentation>;

  /**
   * Update this agent's metadata
   */
  update(
    updates: Partial<
      Pick<
        AgentConfig,
        "name" | "description" | "model" | "systemPrompt" | "mcpServers" | "customData"
      >
    >
  ): Promise<void>;

  /**
   * Delete this agent
   */
  delete(): Promise<void>;
}

// ============================================================================
// Chat Namespace
// ============================================================================

/**
 * Chat operations — create and manage conversations.
 *
 * Each conversation is backed by an Image (persistent record)
 * and returns an AgentHandle for interaction.
 */
export interface ChatNamespace {
  /**
   * Create a new conversation
   */
  create(params: AgentConfig): Promise<AgentHandle>;

  /**
   * List all conversations
   */
  list(): Promise<ImageListResponse>;

  /**
   * Get a conversation by ID
   */
  get(id: string): Promise<AgentHandle | null>;
}

// ============================================================================
// AgentX Client Interface
// ============================================================================

/**
 * AgentX Client SDK — unified interface for local, remote, and server modes.
 *
 * @example
 * ```typescript
 * const ax = createAgentX(config);
 * const agent = await ax.chat.create({ name: "Aristotle", model: "claude-sonnet-4-6" });
 * await agent.send("Hello!");
 * ```
 *
 * For advanced use cases, access `ax.runtime.*` for low-level subsystems.
 */
export interface AgentX {
  /**
   * Check if connected/active
   */
  readonly connected: boolean;

  /**
   * Event bus for subscribing to events
   */
  readonly events: EventBus;

  // ==================== Chat (conversation) ====================

  /**
   * Conversation management — create, list, and open conversations.
   */
  readonly chat: ChatNamespace;

  // ==================== Instance (low-level) ====================

  /**
   * Low-level access to internal subsystems (image, agent, session, llm).
   */
  readonly runtime: RuntimeNamespace;

  // ==================== LLM Provider (system-level) ====================

  /**
   * LLM provider management (system-level, not per-agent)
   */
  readonly provider: LLMNamespace;

  // ==================== Event Subscription ====================

  on<T extends string>(type: T, handler: BusEventHandler<BusEvent & { type: T }>): Unsubscribe;
  onAny(handler: BusEventHandler): Unsubscribe;

  // ==================== Error Handling ====================

  onError(handler: (error: AgentXError) => void): Unsubscribe;

  // ==================== RPC ====================

  /**
   * Universal JSON-RPC entry point
   */
  rpc<T = unknown>(method: string, params?: unknown): Promise<T>;

  // ==================== Lifecycle ====================

  disconnect(): Promise<void>;
  dispose(): Promise<void>;
}

// ============================================================================
// Fluent Builder Interface
// ============================================================================

/**
 * Options for connecting to a remote AgentX server
 */
export interface ConnectOptions {
  /** Authentication headers */
  headers?: MaybeAsync<Record<string, string>>;
  /** Business context injected into requests */
  context?: MaybeAsync<Record<string, unknown>>;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Auto reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
}

/**
 * Configuration for serving as an AgentX server
 */
export interface ServeConfig {
  /** Port to listen on (default: 5200) */
  port?: number;
  /** Host to bind to (default: "0.0.0.0") */
  host?: string;
  /** Existing HTTP server to attach to */
  server?: unknown;
  /** WebSocket path when attached (default: "/ws") */
  wsPath?: string;
}

/**
 * Server instance returned by serve()
 */
export interface AgentXServer {
  listen(port?: number, host?: string): Promise<void>;
  close(): Promise<void>;
  dispose(): Promise<void>;
}

/**
 * AgentXBuilder — fluent API entry point
 *
 * Created by `createAgentX(platform?)`. The builder itself is an AgentX
 * instance (local mode). Call `.connect()` to get a remote client,
 * or `.serve()` to start a server.
 *
 * @example
 * ```typescript
 * const ax = createAgentX(node({ createDriver }))
 *
 * // Local use
 * const agent = await ax.chat.create({ name: "Aristotle" })
 * await agent.send("Hello!")
 *
 * // Connect to remote server
 * const client = await ax.connect("wss://...")
 *
 * // Serve as server
 * const server = await ax.serve({ port: 3100 })
 * ```
 */
export interface AgentXBuilder extends AgentX {
  /**
   * Connect to a remote AgentX server
   */
  connect(serverUrl: string, options?: ConnectOptions): Promise<AgentX>;

  /**
   * Start serving as an AgentX server
   */
  serve(config?: ServeConfig): Promise<AgentXServer>;
}

// ============================================================================
// Internal Types
// ============================================================================

/**
 * Pending request entry
 */
export interface PendingRequest {
  resolve: (response: BusEvent) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}
