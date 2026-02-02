/**
 * Session - Message collector and storage
 *
 * Session is responsible for:
 * - Listening to messages from Agent/Bus
 * - Persisting messages to storage
 *
 * Session is created per Image and stores the conversation history.
 * In the Image-First model, Session persists across Agent restarts.
 */

import type { Message } from "~/agent/message/Message";

/**
 * Session - Collects and stores messages
 */
export interface Session {
  /**
   * Unique session identifier
   */
  readonly sessionId: string;

  /**
   * Associated image ID (persistent conversation entity)
   */
  readonly imageId: string;

  /**
   * Associated container ID
   */
  readonly containerId: string;

  /**
   * Session creation timestamp (Unix ms)
   */
  readonly createdAt: number;

  /**
   * Add a message to the session
   */
  addMessage(message: Message): Promise<void>;

  /**
   * Get all messages
   */
  getMessages(): Promise<Message[]>;

  /**
   * Clear all messages
   */
  clear(): Promise<void>;
}
