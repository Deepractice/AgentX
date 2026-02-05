/**
 * AgentX Client SDK Types
 */

import type { BusEvent, EventBus, Unsubscribe, BusEventHandler } from "@agentxjs/core/event";
import type { CreateDriver } from "@agentxjs/core/driver";
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
 * LLM provider identifier
 */
export type LLMProvider =
  | "anthropic"
  | "openai"
  | "google"
  | "xai"
  | "deepseek"
  | "mistral";

/**
 * AgentX unified configuration
 *
 * Supports two modes:
 * - **Local mode**: `apiKey` present → embedded Runtime + MonoDriver
 * - **Remote mode**: `serverUrl` present → WebSocket client
 */
export interface AgentXConfig {
  // ===== Local Mode =====

  /**
   * API key for LLM provider (local mode)
   * If present, enables local mode with embedded Runtime
   */
  apiKey?: string;

  /**
   * LLM provider (local mode)
   * @default "anthropic"
   */
  provider?: LLMProvider;

  /**
   * Model ID (local mode)
   */
  model?: string;

  /**
   * Base URL for API endpoint (local mode, for proxy/private deployments)
   */
  baseUrl?: string;

  /**
   * Data storage path (local mode)
   * @default ":memory:" (in-memory storage)
   */
  dataPath?: string;

  /**
   * Custom CreateDriver factory (local mode, advanced)
   * If provided, overrides the default MonoDriver
   */
  createDriver?: CreateDriver;

  /**
   * Custom AgentXPlatform (local mode, advanced)
   * If provided, overrides the default NodePlatform
   */
  customPlatform?: AgentXPlatform;

  // ===== Remote Mode =====

  /**
   * WebSocket server URL (remote mode)
   * If present, enables remote mode
   */
  serverUrl?: string;

  /**
   * Headers for authentication (remote mode, static or dynamic)
   * In Node.js: sent during WebSocket handshake
   * In browsers: sent as first auth message (WebSocket API limitation)
   */
  headers?: MaybeAsync<Record<string, string>>;

  /**
   * Business context injected into all requests (remote mode)
   * Useful for passing userId, tenantId, permissions, etc.
   */
  context?: MaybeAsync<Record<string, unknown>>;

  // ===== Common =====

  /**
   * Request timeout in milliseconds (default: 30000)
   */
  timeout?: number;

  /**
   * Enable debug logging
   */
  debug?: boolean;

  /**
   * Auto reconnect on connection loss (default: true, remote mode only)
   */
  autoReconnect?: boolean;
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
 * Image record from server
 */
export interface ImageRecord {
  imageId: string;
  containerId: string;
  sessionId: string;
  name?: string;
  description?: string;
  systemPrompt?: string;
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
   * Create a new image
   */
  create(params: {
    containerId: string;
    name?: string;
    description?: string;
    systemPrompt?: string;
    mcpServers?: Record<string, unknown>;
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
   * Delete image
   */
  delete(imageId: string): Promise<BaseResponse>;
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
   * const pres = agentx.presentations.create(agentId, {
   *   onUpdate: (state) => renderUI(state),
   *   onError: (error) => console.error(error),
   * });
   *
   * await pres.send("Hello!");
   * pres.dispose();
   * ```
   */
  create(agentId: string, options?: PresentationOptions): Presentation;
}

// ============================================================================
// AgentX Client Interface
// ============================================================================

/**
 * AgentX Client SDK
 */
export interface AgentX {
  /**
   * Check if connected to server
   */
  readonly connected: boolean;

  /**
   * Event bus for subscribing to events
   */
  readonly events: EventBus;

  // ==================== Namespaced Operations ====================

  /**
   * Container operations
   */
  readonly containers: ContainerNamespace;

  /**
   * Image operations
   */
  readonly images: ImageNamespace;

  /**
   * Agent operations
   */
  readonly agents: AgentNamespace;

  /**
   * Session operations (messaging)
   */
  readonly sessions: SessionNamespace;

  /**
   * Presentation operations (UI integration)
   */
  readonly presentations: PresentationNamespace;

  // ==================== Event Subscription ====================

  /**
   * Subscribe to specific event type
   */
  on<T extends string>(type: T, handler: BusEventHandler<BusEvent & { type: T }>): Unsubscribe;

  /**
   * Subscribe to all events
   */
  onAny(handler: BusEventHandler): Unsubscribe;

  /**
   * Subscribe to session events
   */
  subscribe(sessionId: string): void;

  // ==================== Lifecycle ====================

  /**
   * Disconnect from server
   */
  disconnect(): Promise<void>;

  /**
   * Dispose and cleanup
   */
  dispose(): Promise<void>;
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
