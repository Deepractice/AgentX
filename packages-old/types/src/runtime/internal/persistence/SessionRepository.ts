/**
 * SessionRepository - Persistence interface for sessions
 */

import type { SessionRecord } from "./record/SessionRecord";
import type { Message } from "~/agent/message/Message";

/**
 * SessionRepository - Storage operations for sessions
 */
export interface SessionRepository {
  /**
   * Save a session record (create or update)
   */
  saveSession(record: SessionRecord): Promise<void>;

  /**
   * Find session by ID
   */
  findSessionById(sessionId: string): Promise<SessionRecord | null>;

  /**
   * Find session by image ID
   */
  findSessionByImageId(imageId: string): Promise<SessionRecord | null>;

  /**
   * Find all sessions for a container
   */
  findSessionsByContainerId(containerId: string): Promise<SessionRecord[]>;

  /**
   * Find all sessions
   */
  findAllSessions(): Promise<SessionRecord[]>;

  /**
   * Delete session by ID
   */
  deleteSession(sessionId: string): Promise<void>;

  /**
   * Check if session exists
   */
  sessionExists(sessionId: string): Promise<boolean>;

  // ==================== Message Operations ====================

  /**
   * Add a message to a session
   */
  addMessage(sessionId: string, message: Message): Promise<void>;

  /**
   * Get all messages for a session
   */
  getMessages(sessionId: string): Promise<Message[]>;

  /**
   * Clear all messages for a session
   */
  clearMessages(sessionId: string): Promise<void>;
}
