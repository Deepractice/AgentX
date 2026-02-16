/**
 * MessageQueue Module
 *
 * SQLite-based message queue for Node.js.
 *
 * @example
 * ```typescript
 * import { SqliteMessageQueue } from "@agentxjs/node-platform/mq";
 *
 * const queue = SqliteMessageQueue.create("./data/queue.db");
 *
 * // Subscribe to topic
 * queue.subscribe("session-123", (entry) => {
 *   console.log(entry.event);
 * });
 *
 * // Publish event
 * const offset = await queue.publish("session-123", { type: "message", data: "hello" });
 *
 * // ACK after processing
 * await queue.ack("connection-1", "session-123", offset);
 *
 * // Recover missed events
 * const lastOffset = await queue.getOffset("connection-1", "session-123");
 * const missed = await queue.recover("session-123", lastOffset);
 * ```
 */

export { OffsetGenerator } from "./OffsetGenerator";
export { SqliteMessageQueue } from "./SqliteMessageQueue";
