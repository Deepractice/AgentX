/**
 * Session Persist Events
 *
 * Events for session persistence operations.
 *
 * Isomorphic Design:
 * - Request events may be forwarded (RemoteEcosystem) or executed (NodeEcosystem)
 * - Result events confirm completion
 */

import type { RuntimeEvent } from "../../RuntimeEvent";

/**
 * Base SessionPersistEvent
 */
export interface SessionPersistEvent<T extends string = string, D = unknown>
  extends RuntimeEvent<T, D> {
  source: "session";
  category: "persist";
}

// ============================================================================
// Save Events
// ============================================================================

/**
 * SessionSaveRequest - Request to save session
 */
export interface SessionSaveRequest extends SessionPersistEvent<"session_save_request"> {
  intent: "request";
  data: {
    sessionId: string;
    title?: string;
    metadata?: Record<string, unknown>;
  };
}

/**
 * SessionSavedEvent - Session was saved
 */
export interface SessionSavedEvent extends SessionPersistEvent<"session_saved"> {
  intent: "result";
  data: {
    sessionId: string;
    savedAt: number;
  };
}

// ============================================================================
// Message Persist Events
// ============================================================================

/**
 * MessagePersistRequest - Request to persist a message
 */
export interface MessagePersistRequest extends SessionPersistEvent<"message_persist_request"> {
  intent: "request";
  data: {
    sessionId: string;
    messageId: string;
    role: "user" | "assistant" | "tool_call" | "tool_result";
    content: unknown;
  };
}

/**
 * MessagePersistedEvent - Message was persisted
 */
export interface MessagePersistedEvent extends SessionPersistEvent<"message_persisted"> {
  intent: "result";
  data: {
    sessionId: string;
    messageId: string;
    savedAt: number;
  };
}

// ============================================================================
// Union Type
// ============================================================================

/**
 * AllSessionPersistEvent - All session persist events
 */
export type AllSessionPersistEvent =
  | SessionSaveRequest
  | SessionSavedEvent
  | MessagePersistRequest
  | MessagePersistedEvent;

/**
 * Session persist request events
 */
export type SessionPersistRequestEvent = SessionSaveRequest | MessagePersistRequest;

/**
 * Session persist result events
 */
export type SessionPersistResultEvent = SessionSavedEvent | MessagePersistedEvent;
