/**
 * ACK callback function type
 * Called when a client acknowledges receipt of an event
 */
export type OnAckCallback = (topic: string, cursor: string, event: unknown) => void;

/**
 * QueueOptions - Configuration for EventQueue
 */
export interface QueueOptions {
  /**
   * Path to SQLite database file
   * Use ":memory:" for in-memory database (testing)
   */
  path: string;

  /**
   * Enable persistence to database
   * When false, Queue acts as pass-through (events notify subscribers but skip DB)
   * Useful for debugging latency issues or when persistence is not needed
   * @default true
   */
  persistenceEnabled?: boolean;

  /**
   * Enable queue functionality
   * When false, Queue becomes a pure filter - events pass through with minimal overhead
   * No cursor generation, no entry wrapping, just direct subscriber notification
   * Useful for debugging to isolate if Queue logic itself causes latency
   * @default true
   */
  queueEnabled?: boolean;

  /**
   * Consumer inactivity timeout (milliseconds)
   * Consumers without ACK activity for this duration are considered stale and deleted
   * @default 86400000 (24 hours)
   */
  consumerTtlMs?: number;

  /**
   * Message retention timeout (milliseconds)
   * Messages older than this are force-deleted regardless of consumer state
   * @default 172800000 (48 hours)
   */
  messageTtlMs?: number;

  /**
   * Maximum number of entries per topic before forcing cleanup
   * @default 10000
   */
  maxEntriesPerTopic?: number;

  /**
   * Interval for automatic cleanup (milliseconds)
   * Set to 0 to disable automatic cleanup
   * @default 300000 (5 minutes)
   */
  cleanupIntervalMs?: number;

  /**
   * Callback when a client acknowledges receipt of an event
   * Used for ACK-driven persistence (e.g., persist session messages only after client ACK)
   * @param topic - Topic identifier (e.g., sessionId)
   * @param cursor - Cursor of acknowledged entry
   * @param event - The acknowledged event
   */
  onAck?: OnAckCallback;
}
