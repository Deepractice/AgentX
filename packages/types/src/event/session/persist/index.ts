/**
 * Session Persist Events
 *
 * Events for session persistence operations.
 *
 * Isomorphic Design:
 * - Request events may be forwarded (RemoteEcosystem) or executed (NodeEcosystem)
 * - Result events confirm completion
 *
 * All SessionPersistEvents have:
 * - source: "session"
 * - category: "persist"
 * - intent: "request" | "result"
 */

import type { SystemEvent } from "../../base";

// ============================================================================
// Base Types
// ============================================================================

/**
 * Base SessionPersistRequest
 */
interface BaseSessionPersistRequest<T extends string, D = unknown> extends SystemEvent<
  T,
  D,
  "session",
  "persist",
  "request"
> {}

/**
 * Base SessionPersistResult
 */
interface BaseSessionPersistResult<T extends string, D = unknown> extends SystemEvent<
  T,
  D,
  "session",
  "persist",
  "result"
> {}

// ============================================================================
// Save Events
// ============================================================================

/**
 * SessionSaveRequest - Request to save session
 */
export interface SessionSaveRequest extends BaseSessionPersistRequest<
  "session_save_request",
  {
    sessionId: string;
    title?: string;
    metadata?: Record<string, unknown>;
  }
> {}

/**
 * SessionSavedEvent - Session was saved
 */
export interface SessionSavedEvent extends BaseSessionPersistResult<
  "session_saved",
  {
    sessionId: string;
    savedAt: number;
  }
> {}

// ============================================================================
// Message Persist Events
// ============================================================================

/**
 * MessagePersistRequest - Request to persist a message
 */
export interface MessagePersistRequest extends BaseSessionPersistRequest<
  "message_persist_request",
  {
    sessionId: string;
    messageId: string;
    role: "user" | "assistant" | "tool_call" | "tool_result";
    content: unknown;
  }
> {}

/**
 * MessagePersistedEvent - Message was persisted
 */
export interface MessagePersistedEvent extends BaseSessionPersistResult<
  "message_persisted",
  {
    sessionId: string;
    messageId: string;
    savedAt: number;
  }
> {}

// ============================================================================
// Union Types
// ============================================================================

/**
 * SessionPersistEvent - All session persist events
 */
export type SessionPersistEvent =
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

/**
 * Type guard: is this a SessionPersistEvent?
 */
export function isSessionPersistEvent(event: SystemEvent): event is SessionPersistEvent {
  return event.source === "session" && event.category === "persist";
}
