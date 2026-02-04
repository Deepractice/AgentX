/**
 * AgentX Client SDK Types
 */

import type { BusEvent, EventBus, Unsubscribe, BusEventHandler } from "@agentxjs/core/event";
import type { Presentation, PresentationOptions } from "./presentation";

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Static or dynamic value
 */
export type MaybeAsync<T> = T | (() => T) | (() => Promise<T>);

/**
 * AgentX client configuration
 */
export interface AgentXConfig {
  /**
   * WebSocket server URL
   */
  serverUrl: string;

  /**
   * Headers for authentication (static or dynamic)
   * In Node.js: sent during WebSocket handshake
   * In browsers: sent as first auth message (WebSocket API limitation)
   */
  headers?: MaybeAsync<Record<string, string>>;

  /**
   * Business context injected into all requests
   * Useful for passing userId, tenantId, permissions, etc.
   */
  context?: MaybeAsync<Record<string, unknown>>;

  /**
   * Request timeout in milliseconds (default: 30000)
   */
  timeout?: number;

  /**
   * Enable debug logging
   */
  debug?: boolean;

  /**
   * Auto reconnect on connection loss (default: true)
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

  // ==================== Agent Operations ====================

  /**
   * Create a new agent
   */
  createAgent(params: { imageId: string; agentId?: string }): Promise<AgentCreateResponse>;

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): Promise<AgentGetResponse>;

  /**
   * List agents
   */
  listAgents(containerId?: string): Promise<AgentListResponse>;

  /**
   * Destroy an agent
   */
  destroyAgent(agentId: string): Promise<BaseResponse>;

  // ==================== Message Operations ====================

  /**
   * Send message to agent
   */
  sendMessage(agentId: string, content: string | unknown[]): Promise<MessageSendResponse>;

  /**
   * Interrupt agent
   */
  interrupt(agentId: string): Promise<BaseResponse>;

  // ==================== Image Operations ====================

  /**
   * Create a new image
   */
  createImage(params: {
    containerId: string;
    name?: string;
    description?: string;
    systemPrompt?: string;
    mcpServers?: Record<string, unknown>;
  }): Promise<ImageCreateResponse>;

  /**
   * Get image by ID
   */
  getImage(imageId: string): Promise<ImageGetResponse>;

  /**
   * List images
   */
  listImages(containerId?: string): Promise<ImageListResponse>;

  /**
   * Delete image
   */
  deleteImage(imageId: string): Promise<BaseResponse>;

  // ==================== Container Operations ====================

  /**
   * Create or get container
   */
  createContainer(containerId: string): Promise<ContainerCreateResponse>;

  /**
   * Get container
   */
  getContainer(containerId: string): Promise<ContainerGetResponse>;

  /**
   * List containers
   */
  listContainers(): Promise<ContainerListResponse>;

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

  // ==================== Presentation ====================

  /**
   * Create a presentation for UI integration
   *
   * @example
   * ```typescript
   * const presentation = agentx.presentation(agentId);
   *
   * presentation.onUpdate((state) => {
   *   render(state.conversations);
   * });
   *
   * await presentation.send("Hello!");
   * ```
   */
  presentation(agentId: string, options?: PresentationOptions): Presentation;

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
