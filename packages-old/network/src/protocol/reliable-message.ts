/**
 * Reliable Message Protocol
 *
 * Internal protocol for message acknowledgment between server and client.
 * This is transparent to the application layer.
 */

/**
 * Wrapper for reliable messages (server -> client)
 * Contains the original message payload with a unique ID for tracking
 */
export interface ReliableWrapper {
  __msgId: string;
  __payload: string;
}

/**
 * ACK message (client -> server)
 * Sent automatically by client when receiving a reliable message
 */
export interface AckMessage {
  __ack: string;
}

/**
 * Type guard for ACK messages
 */
export function isAckMessage(data: unknown): data is AckMessage {
  return typeof data === "object" && data !== null && "__ack" in data;
}

/**
 * Type guard for reliable message wrappers
 */
export function isReliableWrapper(data: unknown): data is ReliableWrapper {
  return typeof data === "object" && data !== null && "__msgId" in data && "__payload" in data;
}
