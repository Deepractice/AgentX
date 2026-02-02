/**
 * MessageQueue - Reliable message delivery with persistence guarantee
 *
 * Standard interface for message queue implementations:
 * - In-memory pub/sub for real-time delivery (RxJS)
 * - Persistence for recovery guarantee (platform-specific)
 * - Consumer offset tracking for at-least-once delivery
 *
 * Platform implementations:
 * - Node.js: SQLite
 * - Cloudflare Workers: Durable Objects Storage
 * - Browser: IndexedDB
 */

// ============================================================================
// Queue Entry
// ============================================================================

/**
 * QueueEntry - A single entry in the message queue
 */
export interface QueueEntry {
  /**
   * Unique offset for this entry (monotonically increasing)
   * Format: "{timestamp_base36}-{sequence}"
   * Example: "lq5x4g2-0001"
   */
  readonly offset: string;

  /**
   * Topic this entry belongs to (e.g., sessionId, agentId)
   */
  readonly topic: string;

  /**
   * The actual event payload
   */
  readonly event: unknown;

  /**
   * Timestamp when the event was published (Unix milliseconds)
   */
  readonly timestamp: number;
}

// ============================================================================
// Queue Configuration
// ============================================================================

/**
 * QueueConfig - Platform-agnostic configuration
 *
 * Platform-specific options (path, namespace, etc.) are handled by Provider.
 */
export interface QueueConfig {
  /**
   * Message retention timeout (milliseconds)
   * Messages older than this may be deleted during cleanup
   * @default 86400000 (24 hours)
   */
  retentionMs?: number;

  /**
   * Maximum entries per topic (optional)
   * When exceeded, oldest entries may be removed
   */
  maxEntriesPerTopic?: number;
}

// ============================================================================
// Unsubscribe
// ============================================================================

/**
 * Unsubscribe function - call to stop receiving messages
 */
export type Unsubscribe = () => void;

// ============================================================================
// MessageQueue Interface
// ============================================================================

/**
 * MessageQueue - Standard interface for message queue
 *
 * All methods that involve storage are async to support all platforms.
 */
export interface MessageQueue {
  /**
   * Publish an event to a topic
   *
   * - Persists to storage (async)
   * - Broadcasts to all subscribers (in-memory, sync)
   *
   * @param topic - Topic identifier (e.g., sessionId)
   * @param event - Event payload
   * @returns Offset of the published entry
   */
  publish(topic: string, event: unknown): Promise<string>;

  /**
   * Subscribe to real-time events on a topic
   *
   * Receives events published after subscription (in-memory pub/sub).
   * For historical events, use recover() first.
   *
   * @param topic - Topic identifier
   * @param handler - Callback for each event entry
   * @returns Unsubscribe function
   */
  subscribe(topic: string, handler: (entry: QueueEntry) => void): Unsubscribe;

  /**
   * Acknowledge consumption (update consumer offset)
   *
   * Call this after successfully processing an event.
   * The offset is persisted for recovery.
   *
   * @param consumerId - Consumer identifier (e.g., connectionId)
   * @param topic - Topic identifier
   * @param offset - Offset of the consumed entry
   */
  ack(consumerId: string, topic: string, offset: string): Promise<void>;

  /**
   * Get consumer's current offset
   *
   * @param consumerId - Consumer identifier
   * @param topic - Topic identifier
   * @returns Offset or null if consumer not found
   */
  getOffset(consumerId: string, topic: string): Promise<string | null>;

  /**
   * Recover historical events from persistence
   *
   * Used for reconnection recovery - fetches events after an offset.
   *
   * @param topic - Topic identifier
   * @param afterOffset - Start offset (exclusive), omit for all history
   * @param limit - Maximum entries to return (default: 1000)
   * @returns Array of event entries
   */
  recover(topic: string, afterOffset?: string, limit?: number): Promise<QueueEntry[]>;

  /**
   * Close the message queue and release resources
   */
  close(): Promise<void>;
}

// ============================================================================
// MessageQueue Provider
// ============================================================================

/**
 * MessageQueueProvider - Factory for creating MessageQueue instances
 *
 * Each platform implements its own provider:
 * - SqliteMessageQueueProvider (Node.js)
 * - DurableMessageQueueProvider (Cloudflare Workers)
 * - IndexedDBMessageQueueProvider (Browser)
 */
export interface MessageQueueProvider {
  /**
   * Create a MessageQueue instance
   *
   * @param config - Platform-agnostic configuration
   * @returns MessageQueue instance
   */
  createQueue(config?: QueueConfig): Promise<MessageQueue>;
}
