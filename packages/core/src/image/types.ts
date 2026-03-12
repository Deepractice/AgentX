/**
 * Image Types
 *
 * Image is the persistent representation of a conversation.
 * Agent is a transient runtime instance created from Image.
 *
 * Lifecycle:
 * - create() → ImageRecord (persistent) + SessionRecord (for messages)
 * - run() → Agent (runtime, in-memory)
 * - stop() / server restart → Agent destroyed, Image remains
 */

import type { McpServerConfig } from "../driver/types";
import type { SessionRepository } from "../persistence/types";

// ============================================================================
// Re-export from persistence (storage schema)
// ============================================================================

export type { ImageMetadata, ImageRecord, ImageRepository } from "../persistence/types";

// ============================================================================
// Image Interface
// ============================================================================

/**
 * Image - Persistent conversation entity
 */
export interface Image {
  readonly imageId: string;
  readonly containerId: string;
  readonly sessionId: string;
  readonly name: string;
  readonly description: string | undefined;
  readonly systemPrompt: string | undefined;
  readonly mcpServers: Record<string, McpServerConfig> | undefined;
  readonly roleId: string | undefined;
  readonly customData: Record<string, unknown> | undefined;
  readonly createdAt: number;
  readonly updatedAt: number;

  /**
   * Update image metadata (name, description, customData)
   */
  update(updates: {
    name?: string;
    description?: string;
    customData?: Record<string, unknown>;
  }): Promise<Image>;

  /**
   * Delete this image and its session
   */
  delete(): Promise<void>;

  /**
   * Get the underlying record
   */
  toRecord(): import("../persistence/types").ImageRecord;
}

// ============================================================================
// Image Configuration
// ============================================================================

/**
 * Context needed by Image operations
 */
export interface ImageContext {
  imageRepository: import("../persistence/types").ImageRepository;
  sessionRepository: SessionRepository;
}

/**
 * Configuration for creating a new Image
 */
export interface ImageCreateConfig {
  containerId: string;
  name?: string;
  description?: string;
  systemPrompt?: string;
  mcpServers?: Record<string, McpServerConfig>;
  roleId?: string;
  customData?: Record<string, unknown>;
}
