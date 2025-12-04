/**
 * Session Lifecycle Events
 *
 * Events for session creation and destruction.
 */

import type { RuntimeEvent } from "../../RuntimeEvent";

/**
 * Base SessionLifecycleEvent
 */
export interface SessionLifecycleEvent<T extends string = string, D = unknown>
  extends RuntimeEvent<T, D> {
  source: "session";
  category: "lifecycle";
}

// ============================================================================
// Lifecycle Events
// ============================================================================

/**
 * SessionCreatedEvent - Session was created
 */
export interface SessionCreatedEvent extends SessionLifecycleEvent<"session_created"> {
  intent: "notification";
  data: {
    sessionId: string;
    imageId: string;
    containerId: string;
    title?: string;
    createdAt: number;
  };
}

/**
 * SessionDestroyedEvent - Session was destroyed
 */
export interface SessionDestroyedEvent extends SessionLifecycleEvent<"session_destroyed"> {
  intent: "notification";
  data: {
    sessionId: string;
    reason?: string;
  };
}

// ============================================================================
// Union Type
// ============================================================================

/**
 * AllSessionLifecycleEvent - All session lifecycle events
 */
export type AllSessionLifecycleEvent = SessionCreatedEvent | SessionDestroyedEvent;
