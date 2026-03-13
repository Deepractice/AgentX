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
 *   name: "My Agent",
 *   contextId: "aristotle",
 *   embody: { model: "claude-sonnet-4-6", systemPrompt: "You are helpful" },
 * }, context);
 *
 * // Load existing image
 * const existing = await loadImage("img_xxx", context);
 * ```
 */

export { createImage, ImageImpl, loadImage } from "./Image";
export type {
  Agent,
  Embodiment,
  Image,
  ImageContext,
  ImageCreateConfig,
  ImageMetadata,
  ImageRecord,
  ImageRepository,
} from "./types";
