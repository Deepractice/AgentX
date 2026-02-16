/**
 * MessageQueue Module
 *
 * Provides standard interfaces for reliable message delivery:
 * - MessageQueue: Core queue interface
 * - MessageQueueProvider: Factory for platform-specific implementations
 * - OffsetGenerator: Utility for generating monotonic offsets
 */

export { OffsetGenerator } from "./OffsetGenerator";
export type {
  MessageQueue,
  MessageQueueProvider,
  QueueConfig,
  QueueEntry,
  Unsubscribe,
} from "./types";
