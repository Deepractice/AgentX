/**
 * SessionRecord - Storage schema for Session persistence
 *
 * Session stores conversation messages for an Image.
 * Each Image has exactly one Session.
 */

/**
 * Session storage record
 */
export interface SessionRecord {
  /**
   * Unique session identifier
   */
  sessionId: string;

  /**
   * Associated image ID (owner of this session)
   */
  imageId: string;

  /**
   * Container this session belongs to
   */
  containerId: string;

  /**
   * Creation timestamp (Unix milliseconds)
   */
  createdAt: number;

  /**
   * Last update timestamp (Unix milliseconds)
   */
  updatedAt: number;
}
