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
   * Message retention timeout (milliseconds)
   * Messages older than this are deleted during cleanup
   * @default 86400000 (24 hours)
   */
  retentionMs?: number;

  /**
   * Cleanup interval (milliseconds)
   * Set to 0 to disable automatic cleanup
   * @default 300000 (5 minutes)
   */
  cleanupIntervalMs?: number;
}
