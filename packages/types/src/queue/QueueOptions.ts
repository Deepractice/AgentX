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
   * Maximum age of acknowledged entries before cleanup (milliseconds)
   * @default 3600000 (1 hour)
   */
  ackRetentionMs?: number;

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
