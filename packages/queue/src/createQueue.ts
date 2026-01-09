/**
 * Factory function to create EventQueue
 */

import type { EventQueue, QueueOptions } from "@agentxjs/types/queue";
import { SqliteEventQueue } from "./SqliteEventQueue";

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
 * // Production: persistent SQLite
 * const queue = await createQueue({
 *   path: "./data/queue.db",
 * });
 *
 * // Testing: in-memory SQLite
 * const queue = await createQueue({
 *   path: ":memory:",
 * });
 * ```
 */
export async function createQueue(options: QueueOptions): Promise<EventQueue> {
  return SqliteEventQueue.create(options);
}
