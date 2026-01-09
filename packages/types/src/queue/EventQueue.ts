import type { QueueEntry } from "./QueueEntry";
import type { Unsubscribe } from "../network/Channel";

/**
 * EventQueue - Interface for reliable event delivery queue
 *
 * Provides durable queue with cursor support for reconnection recovery.
 * Events are partitioned by topic (typically sessionId).
 */
export interface EventQueue {
  /**
   * Append an event to a topic
   * @param topic - Topic identifier (typically sessionId)
   * @param event - Event to append
   * @returns Cursor for the appended entry
   */
  append(topic: string, event: unknown): Promise<string>;

  /**
   * Read entries from a topic after a specific cursor
   * @param topic - Topic identifier
   * @param afterCursor - Start reading after this cursor (exclusive)
   * @param limit - Maximum number of entries to return (default: 100)
   * @returns Array of queue entries
   */
  read(topic: string, afterCursor?: string, limit?: number): Promise<QueueEntry[]>;

  /**
   * Acknowledge an entry (mark as successfully delivered)
   * @param topic - Topic identifier
   * @param cursor - Cursor of entry to acknowledge
   */
  ack(topic: string, cursor: string): Promise<void>;

  /**
   * Subscribe to real-time events on a topic
   * @param topic - Topic identifier
   * @param handler - Callback for new entries
   * @returns Unsubscribe function
   */
  subscribe(topic: string, handler: (entry: QueueEntry) => void): Unsubscribe;

  /**
   * Cleanup acknowledged entries older than retention period
   * @returns Number of entries cleaned up
   */
  cleanup(): Promise<number>;

  /**
   * Get the latest cursor for a topic (for client sync)
   * @param topic - Topic identifier
   * @returns Latest cursor or null if no entries
   */
  getLatestCursor(topic: string): Promise<string | null>;

  /**
   * Close the queue and release resources
   */
  close(): Promise<void>;
}
