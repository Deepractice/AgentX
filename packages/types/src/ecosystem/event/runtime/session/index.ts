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
  AllSessionLifecycleEvent,
  SessionCreatedEvent,
  SessionDestroyedEvent,
} from "./lifecycle";

// Persist Events
export type {
  SessionPersistEvent,
  AllSessionPersistEvent,
  SessionPersistRequestEvent,
  SessionPersistResultEvent,
  SessionSaveRequest,
  SessionSavedEvent,
  MessagePersistRequest,
  MessagePersistedEvent,
} from "./persist";

// Action Events
export type {
  SessionActionEvent,
  AllSessionActionEvent,
  SessionActionRequestEvent,
  SessionActionResultEvent,
  SessionResumeRequest,
  SessionResumedEvent,
  SessionForkRequest,
  SessionForkedEvent,
  SessionTitleUpdateRequest,
  SessionTitleUpdatedEvent,
} from "./action";

// ============================================================================
// Combined Union
// ============================================================================

import type { AllSessionLifecycleEvent } from "./lifecycle";
import type { AllSessionPersistEvent } from "./persist";
import type { AllSessionActionEvent } from "./action";

/**
 * SessionEvent - All session events
 */
export type SessionEvent = AllSessionLifecycleEvent | AllSessionPersistEvent | AllSessionActionEvent;

/**
 * Type guard: is this a session event?
 */
export function isSessionEvent(event: { source?: string }): event is SessionEvent {
  return event.source === "session";
}
