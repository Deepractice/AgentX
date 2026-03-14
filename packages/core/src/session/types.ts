/**
 * Session Types
 *
 * Session manages conversation messages for an Image.
 * Each Image has exactly one Session.
 */

import type { Message } from "../agent/types";

// ============================================================================
// Re-export from persistence (storage schema)
// ============================================================================

export type { SessionRecord, SessionRepository } from "../persistence/types";

// ============================================================================
// Session Interface
// ============================================================================

/**
 * Session - Manages conversation messages
 */
export interface Session {
  /**
   * Unique session identifier
   */
  readonly sessionId: string;

  /**
   * Associated image ID
   */
  readonly imageId: string;

  /**
   * Container this session belongs to
   */
  readonly containerId: string;

  /**
   * Creation timestamp
   */
  readonly createdAt: number;

  /**
   * Initialize session in storage
   */
  initialize(): Promise<void>;

  /**
   * Add a message to the session
   */
  addMessage(message: Message): Promise<void>;

  /**
   * Get all messages in the session
   */
  getMessages(): Promise<Message[]>;

  /**
   * Clear all messages in the session
   */
  clear(): Promise<void>;

  /**
   * Delete all messages after the specified message ID.
   * Used for conversation rewind / edit-and-resend.
   */
  truncateAfter(messageId: string): Promise<void>;
}

// ============================================================================
// Session Configuration
// ============================================================================

/**
 * Configuration for creating a Session
 */
export interface SessionConfig {
  sessionId: string;
  imageId: string;
  containerId: string;
  repository: import("../persistence/types").SessionRepository;
}
