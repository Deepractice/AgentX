/**
 * MessageQueue - Pending message queue interface
 *
 * Exposes read-only queue state for observability.
 * Queue operations (enqueue/dequeue) are internal to Agent implementation.
 */

/**
 * MessageQueue interface
 *
 * Read-only view of the message queue state.
 */
export interface MessageQueue {
  /**
   * Number of messages in queue
   */
  readonly length: number;

  /**
   * Whether queue is empty
   */
  readonly isEmpty: boolean;
}
