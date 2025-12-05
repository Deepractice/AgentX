/**
 * EventsAPI - Runtime event subscription
 *
 * Provides global event subscription for all runtime events.
 * Events flow from Agent → Session → Container → AgentX.
 *
 * @example
 * ```typescript
 * // Subscribe to specific event type
 * agentx.events.on("text_delta", (e) => {
 *   console.log("Agent", e.agentId, "says:", e.data.text);
 * });
 *
 * // Subscribe to all events
 * agentx.events.onAll((e) => {
 *   console.log("Event:", e.type);
 * });
 * ```
 */

import type { RuntimeEvent } from "~/runtime/event/runtime/RuntimeEvent";
import type { Unsubscribe } from "~/agent/AgentEventHandler";

/**
 * EventsAPI - Event subscription interface
 */
export interface EventsAPI {
  /**
   * Subscribe to runtime events by type
   *
   * @param type - Event type to listen for
   * @param handler - Event handler
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsubscribe = agentx.events.on("text_delta", (e) => {
   *   console.log(e.agentId, e.data.text);
   * });
   *
   * // Later: stop listening
   * unsubscribe();
   * ```
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
