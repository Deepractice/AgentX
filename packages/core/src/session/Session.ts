/**
 * Session - Manages conversation messages
 *
 * Collects messages and persists to storage via SessionRepository.
 * Pure implementation without EventBus dependency.
 */

import type { Message } from "../agent/types";
import type { Session, SessionConfig, SessionRecord, SessionRepository } from "./types";

/**
 * SessionImpl - Session implementation
 */
export class SessionImpl implements Session {
  readonly sessionId: string;
  readonly imageId: string;
  readonly containerId: string;
  readonly createdAt: number;

  private readonly repository: SessionRepository;

  constructor(config: SessionConfig) {
    this.sessionId = config.sessionId;
    this.imageId = config.imageId;
    this.containerId = config.containerId;
    this.createdAt = Date.now();
    this.repository = config.repository;
  }

  /**
   * Initialize session in storage
   */
  async initialize(): Promise<void> {
    const record: SessionRecord = {
      sessionId: this.sessionId,
      imageId: this.imageId,
      containerId: this.containerId,
      createdAt: this.createdAt,
      updatedAt: this.createdAt,
    };
    await this.repository.saveSession(record);
  }

  /**
   * Add a message to the session
   */
  async addMessage(message: Message): Promise<void> {
    await this.repository.addMessage(this.sessionId, message);
  }

  /**
   * Get all messages in the session
   */
  async getMessages(): Promise<Message[]> {
    return this.repository.getMessages(this.sessionId);
  }

  /**
   * Clear all messages in the session
   */
  async clear(): Promise<void> {
    await this.repository.clearMessages(this.sessionId);
  }

  /**
   * Delete all messages after the specified message ID.
   * If repository doesn't support truncation, falls back to
   * get-filter-clear-rewrite.
   */
  async truncateAfter(messageId: string): Promise<void> {
    if (this.repository.truncateAfterMessage) {
      await this.repository.truncateAfterMessage(this.sessionId, messageId);
      return;
    }

    // Fallback: get all, filter, clear, rewrite
    const messages = await this.repository.getMessages(this.sessionId);
    const idx = messages.findIndex((m) => m.id === messageId);
    if (idx === -1) throw new Error(`Message not found: ${messageId}`);

    const kept = messages.slice(0, idx + 1);
    await this.repository.clearMessages(this.sessionId);
    for (const msg of kept) {
      await this.repository.addMessage(this.sessionId, msg);
    }
  }
}

/**
 * Create a new Session instance
 */
export function createSession(config: SessionConfig): Session {
  return new SessionImpl(config);
}
