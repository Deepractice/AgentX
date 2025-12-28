/**
 * Session Lifecycle Events
 *
 * Events for session creation and destruction.
 *
 * All SessionLifecycleEvents have:
 * - source: "session"
 * - category: "lifecycle"
 * - intent: "notification"
 */

import type { SystemEvent } from "../../base";

// ============================================================================
// Base Type
// ============================================================================

/**
 * Base SessionLifecycleEvent
 */
interface BaseSessionLifecycleEvent<T extends string, D = unknown> extends SystemEvent<
  T,
  D,
  "session",
  "lifecycle",
  "notification"
> {}

// ============================================================================
// Lifecycle Events
// ============================================================================

/**
 * SessionCreatedEvent - Session was created
 */
export interface SessionCreatedEvent extends BaseSessionLifecycleEvent<
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
export interface SessionDestroyedEvent extends BaseSessionLifecycleEvent<
  "session_destroyed",
  {
    sessionId: string;
    reason?: string;
  }
> {}

// ============================================================================
// Union Type
// ============================================================================

/**
 * SessionLifecycleEvent - All session lifecycle events
 */
export type SessionLifecycleEvent = SessionCreatedEvent | SessionDestroyedEvent;

/**
 * Type guard: is this a SessionLifecycleEvent?
 */
export function isSessionLifecycleEvent(event: SystemEvent): event is SessionLifecycleEvent {
  return event.source === "session" && event.category === "lifecycle";
}
