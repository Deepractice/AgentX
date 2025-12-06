/**
 * useImages - React hook for Image (conversation snapshot) management
 *
 * Images are saved conversation states that can be resumed.
 * Each Image can be resumed to create a new Agent instance.
 *
 * @example
 * ```tsx
 * import { useImages } from "@agentxjs/ui";
 *
 * function ConversationList({ agentx }) {
 *   const {
 *     images,
 *     isLoading,
 *     refresh,
 *     resumeImage,
 *     deleteImage,
 *   } = useImages(agentx);
 *
 *   return (
 *     <div>
 *       {images.map(img => (
 *         <ConversationItem
 *           key={img.imageId}
 *           image={img}
 *           onResume={() => resumeImage(img.imageId)}
 *           onDelete={() => deleteImage(img.imageId)}
 *         />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useEffect, useCallback } from "react";
import type { AgentX, ImageRecord } from "agentxjs";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("ui/useImages");

/**
 * Return type of useImages hook
 */
export interface UseImagesResult {
  /**
   * All saved images (conversation snapshots)
   */
  images: ImageRecord[];

  /**
   * Loading state
   */
  isLoading: boolean;

  /**
   * Error state
   */
  error: Error | null;

  /**
   * Refresh images from server
   */
  refresh: () => Promise<void>;

  /**
   * Resume an image (creates a new Agent instance)
   * @returns The new agent ID and container ID
   */
  resumeImage: (imageId: string) => Promise<{ agentId: string; containerId: string }>;

  /**
   * Delete an image
   */
  deleteImage: (imageId: string) => Promise<void>;

  /**
   * Save current agent as a new image
   */
  snapshotAgent: (agentId: string) => Promise<ImageRecord>;
}

/**
 * Options for useImages hook
 */
export interface UseImagesOptions {
  /**
   * Auto-load images on mount
   * @default true
   */
  autoLoad?: boolean;

  /**
   * Callback when an image is resumed
   */
  onResume?: (agentId: string, containerId: string) => void;

  /**
   * Callback when images list changes
   */
  onImagesChange?: (images: ImageRecord[]) => void;
}

/**
 * React hook for Image management
 *
 * @param agentx - AgentX instance
 * @param options - Optional configuration
 * @returns Image state and operations
 */
export function useImages(
  agentx: AgentX | null,
  options: UseImagesOptions = {}
): UseImagesResult {
  const { autoLoad = true, onResume, onImagesChange } = options;

  // State
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load images from server
  const loadImages = useCallback(async () => {
    if (!agentx) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await agentx.request("image_list_request", {});
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      const records = response.data.records;
      setImages(records);
      onImagesChange?.(records);
      logger.debug("Loaded images", { count: records.length });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      logger.error("Failed to load images", { error });
    } finally {
      setIsLoading(false);
    }
  }, [agentx, onImagesChange]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad && agentx) {
      loadImages();
    }
  }, [autoLoad, agentx, loadImages]);

  // Resume an image
  const resumeImage = useCallback(
    async (imageId: string): Promise<{ agentId: string; containerId: string }> => {
      if (!agentx) {
        throw new Error("AgentX not available");
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await agentx.request("image_resume_request", { imageId });
        if (response.data.error) {
          throw new Error(response.data.error);
        }

        const { agentId, containerId } = response.data;
        if (!agentId || !containerId) {
          throw new Error("Invalid resume response");
        }

        logger.info("Resumed image", { imageId, agentId, containerId });
        onResume?.(agentId, containerId);

        return { agentId, containerId };
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        logger.error("Failed to resume image", { imageId, error });
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [agentx, onResume]
  );

  // Delete an image
  const deleteImage = useCallback(
    async (imageId: string): Promise<void> => {
      if (!agentx) {
        throw new Error("AgentX not available");
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await agentx.request("image_delete_request", { imageId });
        if (response.data.error) {
          throw new Error(response.data.error);
        }

        const newImages = images.filter((img) => img.imageId !== imageId);
        setImages(newImages);
        onImagesChange?.(newImages);
        logger.info("Deleted image", { imageId });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        logger.error("Failed to delete image", { imageId, error });
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [agentx, images, onImagesChange]
  );

  // Snapshot current agent
  const snapshotAgent = useCallback(
    async (agentId: string): Promise<ImageRecord> => {
      if (!agentx) {
        throw new Error("AgentX not available");
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await agentx.request("image_snapshot_request", { agentId });
        if (response.data.error) {
          throw new Error(response.data.error);
        }

        const record = response.data.record;
        if (!record) {
          throw new Error("No image record returned");
        }

        // Add to list
        setImages((prev) => [record, ...prev]);
        onImagesChange?.([record, ...images]);
        logger.info("Created snapshot", { agentId, imageId: record.imageId });

        return record;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        logger.error("Failed to snapshot agent", { agentId, error });
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [agentx, images, onImagesChange]
  );

  return {
    images,
    isLoading,
    error,
    refresh: loadImages,
    resumeImage,
    deleteImage,
    snapshotAgent,
  };
}
