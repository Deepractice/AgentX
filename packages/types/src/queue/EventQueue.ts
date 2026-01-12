import type { QueueEntry } from "./QueueEntry";

/**
 * Unsubscribe function type
 */
export type Unsubscribe = () => void;

/**
 * MessageSender - Generic interface for bidirectional message communication
 *
 * This abstraction allows Queue to work with any transport layer
 * (WebSocket, HTTP, etc.) without direct dependency.
 */
export interface MessageSender {
  /**
   * Unique identifier for this sender/connection
   */
  readonly id: string;

  /**
   * Send a message
   */
  send(message: string): void;

  /**
   * Register message handler
   * @returns Unsubscribe function
   */
  onMessage(handler: (message: string) => void): Unsubscribe;

  /**
   * Register close handler
   * @returns Unsubscribe function
   */
  onClose(handler: () => void): Unsubscribe;
}

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
   * Create or update a consumer for a topic
   * If the consumer already exists, updates the timestamp (reconnection)
   * @param consumerId - Consumer identifier (clientId from client)
   * @param topic - Topic identifier
   */
  createConsumer(consumerId: string, topic: string): Promise<void>;

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
   * Also cleans up stale consumers based on TTL
   * @returns Number of entries cleaned up
   */
  cleanup(): Promise<number>;

  /**
   * Handle a connection for queue protocol messages
   *
   * Automatically processes:
   * - queue_subscribe: Create consumer, send history, subscribe to real-time
   * - queue_ack: Update consumer cursor
   * - queue_unsubscribe: Remove subscription
   *
   * @param sender - Message sender (e.g., WebSocket connection)
   * @returns Unsubscribe function to cleanup when connection closes
   */
  handleConnection(sender: MessageSender): Unsubscribe;

  /**
   * Close the queue and release resources
   */
  close(): Promise<void>;
}
