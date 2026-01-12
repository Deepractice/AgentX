/**
 * Queue Module - Reliable event delivery queue types
 *
 * Provides interfaces for persistent event queuing with reconnection support.
 *
 * @packageDocumentation
 */

export type { EventQueue, MessageSender, Unsubscribe } from "./EventQueue";
export type { QueueEntry } from "./QueueEntry";
export type { QueueOptions } from "./QueueOptions";
export type {
  QueueSubscribeRequest,
  QueueAckRequest,
  QueueUnsubscribeRequest,
  QueueEntryMessage,
  QueueSubscribedMessage,
  QueueMessage,
} from "./QueueSubscription";
