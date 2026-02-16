/**
 * Session Events - Session lifecycle, persist, and action events
 *
 * Events for session operations in the event system.
 */

import type { SystemEvent } from "./base";

// ============================================================================
// Session Lifecycle Events
// ============================================================================

/**
 * Base SessionLifecycleEvent
 */
interface BaseSessionLifecycleEvent<T extends string, D = unknown>
  extends SystemEvent<T, D, "session", "lifecycle", "notification"> {}

/**
 * SessionCreatedEvent - Session was created
 */
export interface SessionCreatedEvent
  extends BaseSessionLifecycleEvent<
    "session_created",
    {
      sessionId: string;
      imageId: string;
      containerId: string;
      title?: string;
      createdAt: number;
    }
  > {}

/**
 * SessionDestroyedEvent - Session was destroyed
 */
export interface SessionDestroyedEvent
  extends BaseSessionLifecycleEvent<
    "session_destroyed",
    {
      sessionId: string;
      reason?: string;
    }
  > {}

/**
 * SessionLifecycleEvent - All session lifecycle events
 */
export type SessionLifecycleEvent = SessionCreatedEvent | SessionDestroyedEvent;

/**
 * Type guard: is this a SessionLifecycleEvent?
 */
export function isSessionLifecycleEvent(event: {
  source?: string;
  category?: string;
}): event is SessionLifecycleEvent {
  return event.source === "session" && event.category === "lifecycle";
}

// ============================================================================
// Session Persist Events
// ============================================================================

/**
 * Base SessionPersistRequest
 */
interface BaseSessionPersistRequest<T extends string, D = unknown>
  extends SystemEvent<T, D, "session", "persist", "request"> {}

/**
 * Base SessionPersistResult
 */
interface BaseSessionPersistResult<T extends string, D = unknown>
  extends SystemEvent<T, D, "session", "persist", "result"> {}

/**
 * SessionSaveRequest - Request to save session
 */
export interface SessionSaveRequest
  extends BaseSessionPersistRequest<
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
export interface SessionSavedEvent
  extends BaseSessionPersistResult<
    "session_saved",
    {
      sessionId: string;
      savedAt: number;
    }
  > {}

/**
 * MessagePersistRequest - Request to persist a message
 */
export interface MessagePersistRequest
  extends BaseSessionPersistRequest<
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
export interface MessagePersistedEvent
  extends BaseSessionPersistResult<
    "message_persisted",
    {
      sessionId: string;
      messageId: string;
      savedAt: number;
    }
  > {}

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
export function isSessionPersistEvent(event: {
  source?: string;
  category?: string;
}): event is SessionPersistEvent {
  return event.source === "session" && event.category === "persist";
}

// ============================================================================
// Session Action Events
// ============================================================================

/**
 * Base SessionActionRequest
 */
interface BaseSessionActionRequest<T extends string, D = unknown>
  extends SystemEvent<T, D, "session", "action", "request"> {}

/**
 * Base SessionActionResult
 */
interface BaseSessionActionResult<T extends string, D = unknown>
  extends SystemEvent<T, D, "session", "action", "result"> {}

/**
 * SessionResumeRequest - Request to resume a session
 */
export interface SessionResumeRequest
  extends BaseSessionActionRequest<
    "session_resume_request",
    {
      sessionId: string;
      containerId?: string;
    }
  > {}

/**
 * SessionResumedEvent - Session was resumed
 */
export interface SessionResumedEvent
  extends BaseSessionActionResult<
    "session_resumed",
    {
      sessionId: string;
      agentId: string;
      resumedAt: number;
    }
  > {}

/**
 * SessionForkRequest - Request to fork a session
 */
export interface SessionForkRequest
  extends BaseSessionActionRequest<
    "session_fork_request",
    {
      sessionId: string;
      newTitle?: string;
    }
  > {}

/**
 * SessionForkedEvent - Session was forked
 */
export interface SessionForkedEvent
  extends BaseSessionActionResult<
    "session_forked",
    {
      originalSessionId: string;
      newSessionId: string;
      newImageId: string;
      forkedAt: number;
    }
  > {}

/**
 * SessionTitleUpdateRequest - Request to update session title
 */
export interface SessionTitleUpdateRequest
  extends BaseSessionActionRequest<
    "session_title_update_request",
    {
      sessionId: string;
      title: string;
    }
  > {}

/**
 * SessionTitleUpdatedEvent - Session title was updated
 */
export interface SessionTitleUpdatedEvent
  extends BaseSessionActionResult<
    "session_title_updated",
    {
      sessionId: string;
      title: string;
      updatedAt: number;
    }
  > {}

/**
 * SessionActionEvent - All session action events
 */
export type SessionActionEvent =
  | SessionResumeRequest
  | SessionResumedEvent
  | SessionForkRequest
  | SessionForkedEvent
  | SessionTitleUpdateRequest
  | SessionTitleUpdatedEvent;

/**
 * Session action request events
 */
export type SessionActionRequestEvent =
  | SessionResumeRequest
  | SessionForkRequest
  | SessionTitleUpdateRequest;

/**
 * Session action result events
 */
export type SessionActionResultEvent =
  | SessionResumedEvent
  | SessionForkedEvent
  | SessionTitleUpdatedEvent;

/**
 * Type guard: is this a SessionActionEvent?
 */
export function isSessionActionEvent(event: {
  source?: string;
  category?: string;
}): event is SessionActionEvent {
  return event.source === "session" && event.category === "action";
}

// ============================================================================
// Session Event Union
// ============================================================================

/**
 * SessionEvent - All session events
 */
export type SessionEvent = SessionLifecycleEvent | SessionPersistEvent | SessionActionEvent;

/**
 * Type guard: is this a session event?
 */
export function isSessionEvent(event: { source?: string }): event is SessionEvent {
  return event.source === "session";
}
