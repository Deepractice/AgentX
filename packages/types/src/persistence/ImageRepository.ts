/**
 * ImageRepository - Persistence interface for agent images
 */

import type { ImageRecord } from "./record/ImageRecord";

/**
 * ImageRepository - Storage operations for images
 */
export interface ImageRepository {
  /**
   * Save an image record (create or update)
   */
  saveImage(record: ImageRecord): Promise<void>;

  /**
   * Find image by ID
   */
  findImageById(imageId: string): Promise<ImageRecord | null>;

  /**
   * Find all images
   */
  findAllImages(): Promise<ImageRecord[]>;

  /**
   * Find images by agent name
   */
  findImagesByName(name: string): Promise<ImageRecord[]>;

  /**
   * Find images by container ID
   */
  findImagesByContainerId(containerId: string): Promise<ImageRecord[]>;

  /**
   * Delete image by ID
   */
  deleteImage(imageId: string): Promise<void>;

  /**
   * Check if image exists
   */
  imageExists(imageId: string): Promise<boolean>;
}
