/**
 * Reliable Message Protocol
 *
 * Internal protocol for message acknowledgment between server and client.
 * This is transparent to the application layer.
 *
 * Flow:
 * 1. Server sends: { __msgId: "xxx", __payload: "actual message" }
 * 2. Client receives, extracts payload, sends: { __ack: "xxx" }
 * 3. Server receives ACK, triggers onAck callback
 */

// ============================================================================
// Protocol Types
// ============================================================================

/**
 * ReliableWrapper - Wrapper for reliable messages (server → client)
 *
 * Contains the original message payload with a unique ID for tracking.
 */
export interface ReliableWrapper {
  /** Unique message ID for tracking */
  __msgId: string;
  /** Original message payload */
  __payload: string;
}

/**
 * AckMessage - Acknowledgment message (client → server)
 *
 * Sent automatically by client when receiving a reliable message.
 */
export interface AckMessage {
  /** Message ID being acknowledged */
  __ack: string;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if data is a ReliableWrapper
 */
export function isReliableWrapper(data: unknown): data is ReliableWrapper {
  return typeof data === "object" && data !== null && "__msgId" in data && "__payload" in data;
}

/**
 * Check if data is an AckMessage
 */
export function isAckMessage(data: unknown): data is AckMessage {
  return typeof data === "object" && data !== null && "__ack" in data;
}

// ============================================================================
// Protocol Helpers
// ============================================================================

/**
 * Wrap a message for reliable delivery
 */
export function wrapMessage(msgId: string, payload: string): ReliableWrapper {
  return { __msgId: msgId, __payload: payload };
}

/**
 * Create an ACK message
 */
export function createAck(msgId: string): AckMessage {
  return { __ack: msgId };
}

/**
 * Unwrap a reliable message, returning the original payload
 */
export function unwrapMessage(wrapper: ReliableWrapper): string {
  return wrapper.__payload;
}

/**
 * Generate a unique message ID
 */
export function generateMessageId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
