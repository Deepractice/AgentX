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

import type {
  Agent,
  ImageRecord,
  ImageRepository,
  McpServerConfig,
  SessionRepository,
} from "../persistence/types";

// ============================================================================
// Re-export from persistence (storage schema)
// ============================================================================

export type {
  Agent,
  ImageMetadata,
  ImageRecord,
  ImageRepository,
} from "../persistence/types";

// ============================================================================
// Image Interface
// ============================================================================

/**
 * Image - Persistent agent entity
 */
export interface Image {
  readonly imageId: string;
  readonly containerId: string;
  readonly sessionId: string;
  readonly name: string;
  readonly description: string | undefined;
  readonly roleId: string | undefined;
  readonly model: string | undefined;
  readonly systemPrompt: string | undefined;
  readonly mcpServers: Record<string, McpServerConfig> | undefined;
  readonly thinking: "disabled" | "low" | "medium" | "high" | undefined;
  readonly providerOptions: Record<string, unknown> | undefined;
  readonly customData: Record<string, unknown> | undefined;
  readonly createdAt: number;
  readonly updatedAt: number;

  /**
   * Update image
   */
  update(
    updates: Partial<
      Pick<
        Agent,
        | "name"
        | "description"
        | "model"
        | "systemPrompt"
        | "mcpServers"
        | "thinking"
        | "providerOptions"
        | "customData"
      >
    >
  ): Promise<Image>;

  /**
   * Delete this image and its session
   */
  delete(): Promise<void>;

  /**
   * Get the underlying record
   */
  toRecord(): ImageRecord;
}

// ============================================================================
// Image Configuration
// ============================================================================

/**
 * Context needed by Image operations
 */
export interface ImageContext {
  imageRepository: ImageRepository;
  sessionRepository: SessionRepository;
}

/**
 * Configuration for creating a new Image.
 *
 * Extends Agent blueprint — the blueprint is serializable and portable,
 * ImageCreateConfig adds the runtime binding (containerId).
 */
export interface ImageCreateConfig extends Agent {
  containerId: string;
}
