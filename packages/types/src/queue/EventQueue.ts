import type { QueueEntry } from "./QueueEntry";
import type { Unsubscribe } from "../network/Channel";

/**
 * EventQueue - Interface for reliable event delivery queue
 *
 * Standard MQ with multi-consumer broadcast support.
 * Each consumer independently tracks their consumption progress.
 */
export interface EventQueue {
  /**
   * Append an event to a topic
   * @param topic - Topic identifier (e.g., sessionId, channelId)
   * @param event - Event to append
   * @returns Cursor for the appended entry
   */
  append(topic: string, event: unknown): Promise<string>;

  /**
   * Create a new consumer for a topic
   * @param topic - Topic identifier
   * @returns Unique consumerId for tracking consumption
   */
  createConsumer(topic: string): Promise<string>;

  /**
   * Read entries for a consumer from their last position
   * @param consumerId - Consumer identifier
   * @param topic - Topic identifier
   * @param limit - Maximum number of entries to return (default: 100)
   * @returns Array of queue entries after consumer's cursor
   */
  read(consumerId: string, topic: string, limit?: number): Promise<QueueEntry[]>;

  /**
   * Acknowledge consumption (updates consumer's cursor position)
   * @param consumerId - Consumer identifier
   * @param topic - Topic identifier
   * @param cursor - Cursor of last consumed entry
   */
  ack(consumerId: string, topic: string, cursor: string): Promise<void>;

  /**
   * Subscribe to real-time events for a consumer
   * @param consumerId - Consumer identifier
   * @param topic - Topic identifier
   * @param handler - Callback for new entries
   * @returns Unsubscribe function
   */
  subscribe(consumerId: string, topic: string, handler: (entry: QueueEntry) => void): Unsubscribe;

  /**
   * Get consumer's current cursor position
   * @param consumerId - Consumer identifier
   * @param topic - Topic identifier
   * @returns Consumer's cursor or null if not exists
   */
  getConsumerCursor(consumerId: string, topic: string): Promise<string | null>;

  /**
   * Delete a consumer subscription
   * @param consumerId - Consumer identifier
   * @param topic - Topic identifier
   */
  deleteConsumer(consumerId: string, topic: string): Promise<void>;

  /**
   * Cleanup entries that all consumers have consumed
   * Deletes entries before MIN(consumer cursors) for each topic
   * @returns Number of entries cleaned up
   */
  cleanup(): Promise<number>;

  /**
   * Close the queue and release resources
   */
  close(): Promise<void>;
}
