/**
 * EventsFacade - Runtime event subscription
 *
 * Internal facade for global event subscription.
 * Events flow from Agent → Session → Container → AgentX.
 */

import type { RuntimeEvent } from "../event/runtime/RuntimeEvent";

/**
 * Unsubscribe function returned by event subscription
 */
export type Unsubscribe = () => void;

/**
 * EventsFacade - Event subscription interface
 */
export interface EventsFacade {
  /**
   * Subscribe to runtime events by type
   *
   * @param type - Event type to listen for
   * @param handler - Event handler
   * @returns Unsubscribe function
   */
  on<T extends RuntimeEvent["type"]>(
    type: T,
    handler: (event: Extract<RuntimeEvent, { type: T }>) => void
  ): Unsubscribe;

  /**
   * Subscribe to all runtime events
   *
   * @param handler - Event handler for all events
   * @returns Unsubscribe function
   */
  onAll(handler: (event: RuntimeEvent) => void): Unsubscribe;
}
