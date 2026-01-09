/**
 * QueueEntry - A single entry in the event queue
 */
export interface QueueEntry {
  /**
   * Unique cursor for this entry (monotonically increasing)
   * Format: "{timestamp_base36}-{sequence}"
   * Example: "lq5x4g2-0001"
   */
  readonly cursor: string;

  /**
   * Topic this entry belongs to (typically sessionId)
   */
  readonly topic: string;

  /**
   * The actual event payload
   */
  readonly event: unknown;

  /**
   * Timestamp when the event was appended (Unix milliseconds)
   */
  readonly timestamp: number;

  /**
   * Whether this entry has been acknowledged
   */
  readonly acknowledged: boolean;

  /**
   * Timestamp when acknowledged (null if not acknowledged)
   */
  readonly acknowledgedAt: number | null;
}
