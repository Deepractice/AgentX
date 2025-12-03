/**
 * ImageRecord - Storage schema for AgentImage persistence
 *
 * Pure data type representing an image (frozen snapshot) in storage.
 * Contains serialized definition, config, and messages for resume/fork capability.
 *
 * Part of Docker-style layered architecture:
 * Definition → build → Image → run → Agent
 *
 * Supports two image types:
 * - 'meta': Genesis image (auto-created from Definition)
 * - 'derived': Committed image (from session.commit())
 */

/**
 * Image type discriminator
 */
export type ImageType = "meta" | "derived";

/**
 * Image storage record
 *
 * Stores the complete frozen snapshot including:
 * - Type (meta or derived)
 * - Definition name (for lookup)
 * - Definition (business config at build time)
 * - Config (runtime config at build time)
 * - Messages (conversation history)
 * - Parent image (for derived images)
 */
export interface ImageRecord {
  /**
   * Unique image identifier
   * - MetaImage: `meta_${definitionName}`
   * - DerivedImage: `img_${nanoid()}`
   */
  imageId: string;

  /**
   * Image type discriminator
   * - 'meta': Genesis image from Definition
   * - 'derived': Committed image from Session
   */
  type: ImageType;

  /**
   * Source definition name
   * Used for looking up MetaImage by definition
   */
  definitionName: string;

  /**
   * Parent image ID (only for derived images)
   * - MetaImage: null
   * - DerivedImage: parent imageId
   */
  parentImageId: string | null;

  /**
   * Serialized agent definition (JSON)
   * Frozen snapshot of business config at build time
   */
  definition: Record<string, unknown>;

  /**
   * Serialized runtime config (JSON)
   * Frozen snapshot of model, apiKey reference, etc. at build time
   */
  config: Record<string, unknown>;

  /**
   * Serialized messages (JSON array)
   * - MetaImage: always []
   * - DerivedImage: frozen conversation history
   */
  messages: Record<string, unknown>[];

  /**
   * Creation timestamp (Unix milliseconds)
   */
  createdAt: number;

  /**
   * Driver-specific state for resume capability
   * - Generic storage for driver implementation details
   * - Claude Driver: { sdkSessionId: "xxx" }
   * - Other drivers can store their own resume data
   * - May be null for images that haven't been run yet
   */
  driverState?: Record<string, unknown> | null;
}
