/**
 * @agentxjs/queue - Reliable event delivery queue for AgentX
 *
 * Provides persistent event queuing with cursor support for reconnection recovery.
 *
 * @packageDocumentation
 */

export { createQueue } from "./createQueue";
export { CursorGenerator } from "./CursorGenerator";

// Re-export types for convenience
export type { EventQueue, QueueEntry, QueueOptions, QueueMessage } from "@agentxjs/types/queue";
