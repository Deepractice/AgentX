/**
 * MessageQueue Module
 *
 * Provides standard interfaces for reliable message delivery:
 * - MessageQueue: Core queue interface
 * - MessageQueueProvider: Factory for platform-specific implementations
 * - OffsetGenerator: Utility for generating monotonic offsets
 */

export type {
  QueueEntry,
  QueueConfig,
  Unsubscribe,
  MessageQueue,
  MessageQueueProvider,
} from "./types";

export { OffsetGenerator } from "./OffsetGenerator";
