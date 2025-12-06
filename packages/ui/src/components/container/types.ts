/**
 * Container Component Types
 *
 * New architecture:
 * - Agent instance = one conversation (short-lived)
 * - Image = saved conversation snapshot (persistent)
 * - Session is internal (not exposed to UI)
 */

import type { ImageRecord } from "agentxjs";

/**
 * Image item for UI display
 *
 * Extends ImageRecord with UI-specific fields.
 */
export interface ImageItem extends ImageRecord {
  /**
   * Preview text (last message snippet)
   */
  preview?: string;

  /**
   * Whether this image is currently active (has a running agent)
   */
  isActive?: boolean;
}

/**
 * Active conversation state
 */
export interface ConversationState {
  /**
   * Current agent ID (null if no active conversation)
   */
  agentId: string | null;

  /**
   * Container ID
   */
  containerId: string | null;

  /**
   * Source image ID (if resumed from an image)
   */
  sourceImageId?: string;
}
