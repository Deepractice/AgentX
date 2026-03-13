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
export interface AgentInfo {
  agentId: string;
  imageId: string;
  containerId: string;
  sessionId: string;
  lifecycle?: string;
}

/**
 * Embodiment — runtime configuration for an agent's "body".
 */
export interface Embodiment {
  model?: string;
  systemPrompt?: string;
  mcpServers?: Record<string, unknown>;
}

/**
 * Image record from server
 */
export interface ImageRecord {
  imageId: string;
  containerId: string;
  sessionId: string;
  name?: string;
  description?: string;
  contextId?: string;
  embody?: Embodiment;
  /** @deprecated Use `embody.systemPrompt` instead. */
  systemPrompt?: string;
  /** @deprecated Use `embody.mcpServers` instead. */
  mcpServers?: Record<string, unknown>;
  customData?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

/**
 * Container info
 */
export interface ContainerInfo {
  containerId: string;
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
export interface AgentCreateResponse extends BaseResponse {
  agentId: string;
  imageId: string;
  containerId: string;
  sessionId: string;
}

/**
 * Agent get response
 */
export interface AgentGetResponse extends BaseResponse {
  agent: AgentInfo | null;
  exists: boolean;
}

/**
 * Agent list response
 */
export interface AgentListResponse extends BaseResponse {
  agents: AgentInfo[];
}

/**
 * Image create response
 */
export interface ImageCreateResponse extends BaseResponse {
  record: ImageRecord;
  __subscriptions?: string[];
}

/**
 * Image get response
 */
export interface ImageGetResponse extends BaseResponse {
  record: ImageRecord | null;
  __subscriptions?: string[];
}

/**
 * Image list response
 */
export interface ImageListResponse extends BaseResponse {
  records: ImageRecord[];
  __subscriptions?: string[];
}

/**
 * Image update response
 */
export interface ImageUpdateResponse extends BaseResponse {
  record: ImageRecord;
}

/**
 * Container create response
 */
export interface ContainerCreateResponse extends BaseResponse {
  containerId: string;
}

/**
 * Container get response
 */
export interface ContainerGetResponse extends BaseResponse {
  containerId: string;
  exists: boolean;
}

/**
 * Container list response
 */
export interface ContainerListResponse extends BaseResponse {
  containerIds: string[];
}

/**
 * Message send response
 */
export interface MessageSendResponse extends BaseResponse {
  agentId: string;
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
 * Container operations namespace
 */
export interface ContainerNamespace {
  /**
   * Create or get container
   */
  create(containerId: string): Promise<ContainerCreateResponse>;

  /**
   * Get container
   */
  get(containerId: string): Promise<ContainerGetResponse>;

  /**
   * List containers
   */
  list(): Promise<ContainerListResponse>;
}

/**
 * Image operations namespace
 */
export interface ImageNamespace {
  /**
   * Create a new image from an Agent blueprint
   */
  create(params: {
    containerId: string;
    name?: string;
    description?: string;
    contextId?: string;
    embody?: Embodiment;
    customData?: Record<string, unknown>;
  }): Promise<ImageCreateResponse>;

  /**
   * Get image by ID
   */
  get(imageId: string): Promise<ImageGetResponse>;

  /**
   * List images
   */
  list(containerId?: string): Promise<ImageListResponse>;

  /**
   * Update image
   */
  update(
    imageId: string,
    updates: {
      name?: string;
      description?: string;
      embody?: Embodiment;
      customData?: Record<string, unknown>;
    }
  ): Promise<ImageUpdateResponse>;

  /**
   * Delete image
   */
  delete(imageId: string): Promise<BaseResponse>;

  /**
   * Get message history for an image
   */
  getMessages(imageId: string): Promise<Message[]>;
}

/**
 * Agent operations namespace
 */
export interface AgentNamespace {
  /**
   * Create a new agent
   */
  create(params: { imageId: string; agentId?: string }): Promise<AgentCreateResponse>;

  /**
   * Get agent by ID
   */
  get(agentId: string): Promise<AgentGetResponse>;

  /**
   * List agents
   */
  list(containerId?: string): Promise<AgentListResponse>;

  /**
   * Destroy an agent
   */
  destroy(agentId: string): Promise<BaseResponse>;
}

/**
 * Session operations namespace (messaging)
 */
export interface SessionNamespace {
  /**
   * Send message to agent
   */
  send(agentId: string, content: string | unknown[]): Promise<MessageSendResponse>;

  /**
   * Interrupt agent
   */
  interrupt(agentId: string): Promise<BaseResponse>;

  /**
   * Get message history for an agent's session
   */
  getMessages(agentId: string): Promise<Message[]>;
}

/**
 * LLM provider operations namespace
 */
export interface LLMNamespace {
  /**
   * Create a new LLM provider configuration
   */
  create(params: {
    containerId: string;
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
   * List LLM providers for a container
   */
  list(containerId: string): Promise<LLMProviderListResponse>;

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
   * Set default LLM provider for a container
   */
  setDefault(id: string): Promise<BaseResponse>;

  /**
   * Get default LLM provider for a container
   */
  getDefault(containerId: string): Promise<LLMProviderDefaultResponse>;
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
   * const pres = agentx.presentation.create(agentId, {
   *   onUpdate: (state) => renderUI(state),
   *   onError: (error) => console.error(error),
   * });
   *
   * await pres.send("Hello!");
   * pres.dispose();
   * ```
   */
  create(agentId: string, options?: PresentationOptions): Promise<Presentation>;
}

// ============================================================================
// AgentX Client Interface
// ============================================================================

/**
 * AgentX Client SDK — unified interface for local, remote, and server modes
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

  // ==================== Namespaced Operations ====================

  readonly container: ContainerNamespace;
  readonly image: ImageNamespace;
  readonly agent: AgentNamespace;
  readonly session: SessionNamespace;
  readonly presentation: PresentationNamespace;
  readonly llm: LLMNamespace;

  // ==================== Event Subscription ====================

  on<T extends string>(type: T, handler: BusEventHandler<BusEvent & { type: T }>): Unsubscribe;
  onAny(handler: BusEventHandler): Unsubscribe;
  subscribe(sessionId: string): void;

  // ==================== Error Handling ====================

  /**
   * Top-level error handler — receives all AgentXError instances from any layer.
   *
   * Independent of `on("error", ...)` (stream events) and `presentation.onError` (UI errors).
   *
   * @example
   * ```typescript
   * ax.onError((error) => {
   *   console.error(`[${error.category}] ${error.code}: ${error.message}`);
   *   if (!error.recoverable) {
   *     // Circuit is open, stop sending requests
   *   }
   * });
   * ```
   */
  onError(handler: (error: AgentXError) => void): Unsubscribe;

  // ==================== RPC ====================

  /**
   * Universal JSON-RPC entry point — works in all modes:
   * - Local: dispatches to CommandHandler directly
   * - Remote: forwards to the remote server via RPC client
   *
   * @example
   * ```typescript
   * const result = await ax.rpc("container.create", { containerId: "default" });
   * const { records } = await ax.rpc<{ records: ImageRecord[] }>("image.list");
   * ```
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
 * await ax.agent.create({ imageId: "..." })
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
