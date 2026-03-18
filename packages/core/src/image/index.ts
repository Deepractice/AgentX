/**
 * Image Module
 *
 * Manages persistent conversation entities (Images).
 *
 * Usage:
 * ```typescript
 * import { createImage, loadImage } from "@agentxjs/core/image";
 *
 * const image = await createImage({
 *   containerId: "container-1",
 *   name: "My Agent",
 *   roleId: "aristotle",
 *   model: "claude-sonnet-4-6",
 *   systemPrompt: "You are helpful",
 * }, context);
 * ```
 */

export { createImage, ImageImpl, loadImage } from "./Image";
export type {
  Agent,
  Image,
  ImageContext,
  ImageCreateConfig,
  ImageMetadata,
  ImageRecord,
  ImageRepository,
} from "./types";
