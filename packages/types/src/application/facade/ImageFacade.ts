/**
 * ImageFacade - Agent image management
 *
 * Internal facade for managing AgentImage lifecycle.
 * Handles MetaImage and DerivedImage operations.
 *
 * Image types:
 * - MetaImage: Auto-created when definition is registered (genesis, empty)
 * - DerivedImage: Created from session.commit() (has messages)
 *
 * Definition → Image → Session → Agent
 */

import type { AgentImage, MetaImage } from "../image";

/**
 * ImageFacade - Image CRUD operations
 */
export interface ImageFacade {
  /**
   * Get an image by ID
   *
   * @param imageId - Image identifier
   * @returns Image or undefined if not found
   */
  get(imageId: string): Promise<AgentImage | undefined>;

  /**
   * Get the MetaImage for a definition
   *
   * MetaImage is auto-created when a definition is registered.
   *
   * @param definitionName - Definition name
   * @returns MetaImage or undefined if definition not found
   */
  getMetaImage(definitionName: string): Promise<MetaImage | undefined>;

  /**
   * List all images
   *
   * @returns Array of all images (MetaImages and DerivedImages)
   */
  list(): Promise<AgentImage[]>;

  /**
   * List images by definition name
   *
   * @param definitionName - Definition name
   * @returns Array of images for the definition
   */
  listByDefinition(definitionName: string): Promise<AgentImage[]>;

  /**
   * Check if an image exists
   *
   * @param imageId - Image identifier
   * @returns true if exists
   */
  exists(imageId: string): Promise<boolean>;

  /**
   * Delete a derived image
   *
   * Note: MetaImages cannot be deleted directly.
   * They are removed when the definition is unregistered.
   *
   * @param imageId - Image identifier
   * @returns true if deleted, false if not found or is MetaImage
   */
  delete(imageId: string): Promise<boolean>;
}
