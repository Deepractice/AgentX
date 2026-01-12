/**
 * Queue Subscription Protocol Messages
 *
 * Defines the client-server message types for queue subscription.
 */

/**
 * Client-to-Server: Subscribe to a topic
 */
export interface QueueSubscribeRequest {
  type: "queue_subscribe";
  topic: string;
  /** Client identifier (baseClientId + tabId) */
  clientId: string;
  /** Resume from this cursor (exclusive) */
  afterCursor?: string;
}

/**
 * Client-to-Server: Acknowledge entry consumption
 */
export interface QueueAckRequest {
  type: "queue_ack";
  topic: string;
  clientId: string;
  cursor: string;
}

/**
 * Client-to-Server: Unsubscribe from a topic
 */
export interface QueueUnsubscribeRequest {
  type: "queue_unsubscribe";
  topic: string;
  clientId: string;
}

/**
 * Server-to-Client: Queue entry delivery
 */
export interface QueueEntryMessage {
  type: "queue_entry";
  topic: string;
  cursor: string;
  event: unknown;
  timestamp: number;
}

/**
 * Server-to-Client: Subscription confirmation
 */
export interface QueueSubscribedMessage {
  type: "queue_subscribed";
  topic: string;
  latestCursor: string | null;
}

/**
 * Union type for all queue protocol messages
 */
export type QueueMessage =
  | QueueSubscribeRequest
  | QueueAckRequest
  | QueueUnsubscribeRequest
  | QueueEntryMessage
  | QueueSubscribedMessage;
