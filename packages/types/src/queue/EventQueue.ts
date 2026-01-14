/**
 * EventQueue - Reliable event delivery with persistence guarantee
 *
 * A traditional MQ implementation:
 * - In-memory pub/sub for real-time delivery (RxJS)
 * - SQLite persistence for recovery guarantee (sync writes, fast)
 * - Consumer cursor tracking for at-least-once delivery
 *
 * Decoupled from network protocol - caller decides when to ACK.
 */

import type { QueueEntry } from "./QueueEntry";

/**
 * Unsubscribe function
 */
export type Unsubscribe = () => void;

/**
 * EventQueue interface
 */
export interface EventQueue {
  /**
   * Publish an event to a topic
   *
   * - Persists to SQLite (sync, fast)
   * - Broadcasts to all subscribers (in-memory)
   *
   * @param topic - Topic identifier (e.g., sessionId)
   * @param event - Event payload
   * @returns Cursor of the published entry
   */
  publish(topic: string, event: unknown): string;

  /**
   * Subscribe to real-time events on a topic
   *
   * Receives events published after subscription.
   * For historical events, use recover() first.
   *
   * @param topic - Topic identifier
   * @param handler - Callback for each event entry
   * @returns Unsubscribe function
   */
  subscribe(topic: string, handler: (entry: QueueEntry) => void): Unsubscribe;

  /**
   * Acknowledge consumption (update consumer cursor)
   *
   * Call this after successfully processing an event.
   * The cursor position is persisted for recovery.
   *
   * @param consumerId - Consumer identifier (e.g., connectionId)
   * @param topic - Topic identifier
   * @param cursor - Cursor of the consumed entry
   */
  ack(consumerId: string, topic: string, cursor: string): Promise<void>;

  /**
   * Get consumer's current cursor position
   *
   * @param consumerId - Consumer identifier
   * @param topic - Topic identifier
   * @returns Cursor or null if consumer not found
   */
  getCursor(consumerId: string, topic: string): Promise<string | null>;

  /**
   * Recover historical events from persistence
   *
   * Used for reconnection recovery - fetches events after a cursor.
   *
   * @param topic - Topic identifier
   * @param afterCursor - Start cursor (exclusive), omit for all history
   * @param limit - Maximum entries to return (default: 1000)
   * @returns Array of event entries
   */
  recover(topic: string, afterCursor?: string, limit?: number): Promise<QueueEntry[]>;

  /**
   * Close the event queue and release resources
   */
  close(): Promise<void>;
}
