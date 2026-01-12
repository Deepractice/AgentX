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
}
