/**
 * Session Action Events
 *
 * Events for user-initiated session actions (resume, fork, etc.)
 *
 * All SessionActionEvents have:
 * - source: "session"
 * - category: "action"
 * - intent: "request" | "result"
 */

import type { SystemEvent } from "../../base";

// ============================================================================
// Base Types
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

// ============================================================================
// Resume Events
// ============================================================================

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

// ============================================================================
// Fork Events
// ============================================================================

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

// ============================================================================
// Title Update Events
// ============================================================================

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

// ============================================================================
// Union Types
// ============================================================================

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
export function isSessionActionEvent(event: SystemEvent): event is SessionActionEvent {
  return event.source === "session" && event.category === "action";
}
