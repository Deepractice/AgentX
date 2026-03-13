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
  Embodiment,
  ImageRecord,
  ImageRepository,
  SessionRepository,
} from "../persistence/types";

// ============================================================================
// Re-export from persistence (storage schema)
// ============================================================================

export type {
  Agent,
  Embodiment,
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
  readonly contextId: string | undefined;
  readonly embody: Embodiment | undefined;
  readonly customData: Record<string, unknown> | undefined;
  readonly createdAt: number;
  readonly updatedAt: number;

  /**
   * Update image
   */
  update(updates: {
    name?: string;
    description?: string;
    embody?: Embodiment;
    customData?: Record<string, unknown>;
  }): Promise<Image>;

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
