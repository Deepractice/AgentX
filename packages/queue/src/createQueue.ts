/**
 * Factory function to create EventQueue
 */

import type { EventQueue as IEventQueue, QueueOptions } from "@agentxjs/types/queue";
import { EventQueue } from "./EventQueue";

/**
 * Create an EventQueue instance
 *
 * @param options - Queue configuration
 * @returns EventQueue instance
 *
 * @example
 * ```typescript
 * import { createQueue } from "@agentxjs/queue";
 *
 * const queue = createQueue({ path: "./data/queue.db" });
 *
 * // Subscribe to events
 * queue.subscribe("session-123", (entry) => {
 *   console.log("Received:", entry.event);
 * });
 *
 * // Publish events
 * const cursor = queue.publish("session-123", { type: "message", text: "hello" });
 *
 * // ACK after processing
 * await queue.ack("client-1", "session-123", cursor);
 *
 * // Recover on reconnection
 * const lastCursor = await queue.getCursor("client-1", "session-123");
 * const missed = await queue.recover("session-123", lastCursor);
 * ```
 */
export function createQueue(options: QueueOptions): IEventQueue {
  return EventQueue.create(options);
}
