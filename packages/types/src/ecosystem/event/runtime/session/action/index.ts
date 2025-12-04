/**
 * Session Action Events
 *
 * Events for user-initiated session actions (resume, fork, etc.)
 */

import type { RuntimeEvent } from "../../RuntimeEvent";

/**
 * Base SessionActionEvent
 */
export interface SessionActionEvent<T extends string = string, D = unknown>
  extends RuntimeEvent<T, D> {
  source: "session";
  category: "action";
}

// ============================================================================
// Resume Events
// ============================================================================

/**
 * SessionResumeRequest - Request to resume a session
 */
export interface SessionResumeRequest extends SessionActionEvent<"session_resume_request"> {
  intent: "request";
  data: {
    sessionId: string;
    containerId?: string;
  };
}

/**
 * SessionResumedEvent - Session was resumed
 */
export interface SessionResumedEvent extends SessionActionEvent<"session_resumed"> {
  intent: "result";
  data: {
    sessionId: string;
    agentId: string;
    resumedAt: number;
  };
}

// ============================================================================
// Fork Events
// ============================================================================

/**
 * SessionForkRequest - Request to fork a session
 */
export interface SessionForkRequest extends SessionActionEvent<"session_fork_request"> {
  intent: "request";
  data: {
    sessionId: string;
    newTitle?: string;
  };
}

/**
 * SessionForkedEvent - Session was forked
 */
export interface SessionForkedEvent extends SessionActionEvent<"session_forked"> {
  intent: "result";
  data: {
    originalSessionId: string;
    newSessionId: string;
    newImageId: string;
    forkedAt: number;
  };
}

// ============================================================================
// Title Update Events
// ============================================================================

/**
 * SessionTitleUpdateRequest - Request to update session title
 */
export interface SessionTitleUpdateRequest
  extends SessionActionEvent<"session_title_update_request"> {
  intent: "request";
  data: {
    sessionId: string;
    title: string;
  };
}

/**
 * SessionTitleUpdatedEvent - Session title was updated
 */
export interface SessionTitleUpdatedEvent extends SessionActionEvent<"session_title_updated"> {
  intent: "result";
  data: {
    sessionId: string;
    title: string;
    updatedAt: number;
  };
}

// ============================================================================
// Union Type
// ============================================================================

/**
 * AllSessionActionEvent - All session action events
 */
export type AllSessionActionEvent =
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
