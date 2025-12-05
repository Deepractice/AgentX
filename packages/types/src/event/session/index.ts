/**
 * Session Events
 *
 * All events related to Session operations:
 * - Lifecycle: creation, destruction
 * - Persist: save, message persistence
 * - Action: resume, fork, title update
 */

// Lifecycle Events
export type {
  SessionLifecycleEvent,
  SessionCreatedEvent,
  SessionDestroyedEvent,
} from "./lifecycle";
export { isSessionLifecycleEvent } from "./lifecycle";

// Persist Events
export type {
  SessionPersistEvent,
  SessionPersistRequestEvent,
  SessionPersistResultEvent,
  SessionSaveRequest,
  SessionSavedEvent,
  MessagePersistRequest,
  MessagePersistedEvent,
} from "./persist";
export { isSessionPersistEvent } from "./persist";

// Action Events
export type {
  SessionActionEvent,
  SessionActionRequestEvent,
  SessionActionResultEvent,
  SessionResumeRequest,
  SessionResumedEvent,
  SessionForkRequest,
  SessionForkedEvent,
  SessionTitleUpdateRequest,
  SessionTitleUpdatedEvent,
} from "./action";
export { isSessionActionEvent } from "./action";

// ============================================================================
// Combined Union
// ============================================================================

import type { SessionLifecycleEvent } from "./lifecycle";
import type { SessionPersistEvent } from "./persist";
import type { SessionActionEvent } from "./action";

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
