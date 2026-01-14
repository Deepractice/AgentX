/**
 * @agentxjs/queue - Reliable event delivery queue for AgentX
 *
 * RxJS-based in-memory pub/sub with SQLite persistence for recovery.
 *
 * @packageDocumentation
 */

export { createQueue } from "./createQueue";
export { CursorGenerator } from "./CursorGenerator";

// Re-export types
export type { EventQueue, QueueEntry, QueueOptions, Unsubscribe } from "@agentxjs/types/queue";
