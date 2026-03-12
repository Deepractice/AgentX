/**
 * Persistence Types - Repository interfaces and record types
 *
 * Defines standard interfaces for data persistence.
 * Implementations are provided by platform packages (node, cloudflare).
 */

import type { Message } from "../agent/types";
import type { McpServerConfig } from "../driver/types";

// Re-export McpServerConfig for convenience
export type { McpServerConfig } from "../driver/types";

// ============================================================================
// Container Record
// ============================================================================

/**
 * Container configuration (extensible)
 */
export interface ContainerConfig {
  [key: string]: unknown;
}

/**
 * ContainerRecord - Persistent container data
 *
 * Represents a logical container (resource isolation unit).
 * Each container provides an isolated environment for running Agents.
 */
export interface ContainerRecord {
  /** Unique container identifier */
  containerId: string;

  /** Container creation timestamp (Unix milliseconds) */
  createdAt: number;

  /** Last update timestamp (Unix milliseconds) */
  updatedAt: number;

  /** Container configuration (extensible) */
  config?: ContainerConfig;
}

// ============================================================================
// Image Record
// ============================================================================

/**
 * Image metadata for storing provider-specific data
 */
export interface ImageMetadata {
  /** Driver session ID for conversation resume */
  driverSessionId?: string;
}

/**
 * ImageRecord - Persistent representation of a conversation
 *
 * Image is the primary entity users interact with (displayed as "conversation").
 * Agent is a transient runtime instance created from Image.
 *
 * Lifecycle:
 * - image_create → ImageRecord (persistent)
 * - image_run → Agent (runtime, in-memory)
 * - image_stop / server restart → Agent destroyed, Image remains
 */
export interface ImageRecord {
  /** Unique image identifier (pattern: `img_${nanoid()}`) */
  imageId: string;

  /** Container ID (user isolation boundary) */
  containerId: string;

  /** Session ID for message storage */
  sessionId: string;

  /** Conversation name (displayed to user) */
  name: string;

  /** Conversation description (optional) */
  description?: string;

  /** System prompt - controls agent behavior */
  systemPrompt?: string;

  /** Parent image ID (for fork/branch feature) */
  parentImageId?: string;

  /** MCP servers configuration */
  mcpServers?: Record<string, McpServerConfig>;

  /** RoleX role ID — the individual this image represents */
  roleId?: string;

  /** Provider-specific metadata */
  metadata?: ImageMetadata;

  /** Application-specific custom data (favorites, sort order, tags, etc.) */
  customData?: Record<string, unknown>;

  /** Creation timestamp (Unix milliseconds) */
  createdAt: number;

  /** Last update timestamp (Unix milliseconds) */
  updatedAt: number;
}

// ============================================================================
// Session Record
// ============================================================================

/**
 * SessionRecord - Storage schema for Session persistence
 *
 * Session stores conversation messages for an Image.
 * Each Image has exactly one Session.
 */
export interface SessionRecord {
  /** Unique session identifier */
  sessionId: string;

  /** Associated image ID (owner of this session) */
  imageId: string;

  /** Container this session belongs to */
  containerId: string;

  /** Creation timestamp (Unix milliseconds) */
  createdAt: number;

  /** Last update timestamp (Unix milliseconds) */
  updatedAt: number;
}

// ============================================================================
// LLM Provider Record
// ============================================================================

/**
 * Supported LLM API protocols
 */
export type LLMProtocol = "anthropic" | "openai";

/**
 * LLMProviderRecord - Persistent LLM provider configuration
 *
 * Represents a configured LLM provider (e.g., Anthropic, OpenAI, Deepseek).
 * Separates vendor (who provides) from protocol (API format).
 *
 * Examples:
 * - Anthropic official: vendor="anthropic", protocol="anthropic"
 * - Deepseek: vendor="deepseek", protocol="openai"
 * - Ollama local: vendor="ollama", protocol="openai"
 * - Vercel proxying Anthropic: vendor="vercel", protocol="anthropic"
 */
export interface LLMProviderRecord {
  /** Unique provider configuration identifier */
  id: string;

  /** Container this provider belongs to */
  containerId: string;

  /** Display name (e.g., "My Anthropic", "Company Gateway") */
  name: string;

  /** Vendor - who provides the service */
  vendor: string;

  /** Protocol - API format (determines which SDK to use) */
  protocol: LLMProtocol;

  /** API key for authentication */
  apiKey: string;

  /** Custom base URL (for proxies, self-hosted, etc.) */
  baseUrl?: string;

  /** Default model to use */
  model?: string;

  /** Whether this is the default provider for the container */
  isDefault?: boolean;

  /** Creation timestamp (Unix milliseconds) */
  createdAt: number;

  /** Last update timestamp (Unix milliseconds) */
  updatedAt: number;
}

// ============================================================================
// Container Repository
// ============================================================================

/**
 * ContainerRepository - Storage operations for containers
 */
export interface ContainerRepository {
  /** Save a container record (create or update) */
  saveContainer(record: ContainerRecord): Promise<void>;

  /** Find container by ID */
  findContainerById(containerId: string): Promise<ContainerRecord | null>;

  /** Find all containers */
  findAllContainers(): Promise<ContainerRecord[]>;

  /** Delete container by ID */
  deleteContainer(containerId: string): Promise<void>;

  /** Check if container exists */
  containerExists(containerId: string): Promise<boolean>;
}

// ============================================================================
// Image Repository
// ============================================================================

/**
 * ImageRepository - Storage operations for images
 */
export interface ImageRepository {
  /** Save an image record (create or update) */
  saveImage(record: ImageRecord): Promise<void>;

  /** Find image by ID */
  findImageById(imageId: string): Promise<ImageRecord | null>;

  /** Find all images */
  findAllImages(): Promise<ImageRecord[]>;

  /** Find images by agent name */
  findImagesByName(name: string): Promise<ImageRecord[]>;

  /** Find images by container ID */
  findImagesByContainerId(containerId: string): Promise<ImageRecord[]>;

  /** Delete image by ID */
  deleteImage(imageId: string): Promise<void>;

  /** Check if image exists */
  imageExists(imageId: string): Promise<boolean>;

  /** Update image metadata (merges with existing) */
  updateMetadata(imageId: string, metadata: Partial<ImageMetadata>): Promise<void>;
}

// ============================================================================
// Session Repository
// ============================================================================

/**
 * SessionRepository - Storage operations for sessions
 */
export interface SessionRepository {
  /** Save a session record (create or update) */
  saveSession(record: SessionRecord): Promise<void>;

  /** Find session by ID */
  findSessionById(sessionId: string): Promise<SessionRecord | null>;

  /** Find session by image ID */
  findSessionByImageId(imageId: string): Promise<SessionRecord | null>;

  /** Find all sessions for a container */
  findSessionsByContainerId(containerId: string): Promise<SessionRecord[]>;

  /** Find all sessions */
  findAllSessions(): Promise<SessionRecord[]>;

  /** Delete session by ID */
  deleteSession(sessionId: string): Promise<void>;

  /** Check if session exists */
  sessionExists(sessionId: string): Promise<boolean>;

  // ==================== Message Operations ====================

  /** Add a message to a session */
  addMessage(sessionId: string, message: Message): Promise<void>;

  /** Get all messages for a session */
  getMessages(sessionId: string): Promise<Message[]>;

  /** Clear all messages for a session */
  clearMessages(sessionId: string): Promise<void>;
}

// ============================================================================
// LLM Provider Repository
// ============================================================================

/**
 * LLMProviderRepository - Storage operations for LLM provider configurations
 */
export interface LLMProviderRepository {
  /** Save a provider record (create or update) */
  saveLLMProvider(record: LLMProviderRecord): Promise<void>;

  /** Find provider by ID */
  findLLMProviderById(id: string): Promise<LLMProviderRecord | null>;

  /** Find all providers for a container */
  findLLMProvidersByContainerId(containerId: string): Promise<LLMProviderRecord[]>;

  /** Delete provider by ID */
  deleteLLMProvider(id: string): Promise<void>;

  /** Check if provider exists */
  llmProviderExists(id: string): Promise<boolean>;

  /** Get default provider for a container */
  findDefaultLLMProvider(containerId: string): Promise<LLMProviderRecord | null>;

  /** Set a provider as default for its container (unsets previous default) */
  setDefaultLLMProvider(id: string): Promise<void>;
}
