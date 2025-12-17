import type { TextPart } from "./TextPart";
import type { ImagePart } from "./ImagePart";
import type { FilePart } from "./FilePart";

/**
 * User Content Part
 *
 * Subset of ContentPart types that users can send in messages.
 * - TextPart: Plain text content
 * - ImagePart: Image attachments (JPEG, PNG, GIF, WebP)
 * - FilePart: File attachments (PDF, documents, etc.)
 */
export type UserContentPart = TextPart | ImagePart | FilePart;
