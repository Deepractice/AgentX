/**
 * Image Module
 *
 * Manages persistent conversation entities (Images).
 *
 * Usage:
 * ```typescript
 * import { createImage, loadImage, type ImageRepository } from "@agentxjs/core/image";
 *
 * const context = {
 *   imageRepository: myImageRepository,
 *   sessionRepository: mySessionRepository,
 * };
 *
 * // Create new image
 * const image = await createImage({
 *   containerId: "container-1",
 *   name: "My Conversation",
 *   systemPrompt: "You are helpful",
 * }, context);
 *
 * // Load existing image
 * const existing = await loadImage("img_xxx", context);
 * ```
 */

export { createImage, ImageImpl, loadImage } from "./Image";
export type {
  Image,
  ImageContext,
  ImageCreateConfig,
  ImageMetadata,
  ImageRecord,
  ImageRepository,
} from "./types";
