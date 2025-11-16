/**
 * Reactor Pattern
 *
 * A Reactor is an independent event processing unit that:
 * 1. Subscribes to events from EventBus
 * 2. Processes events and performs business logic
 * 3. Optionally emits new events
 *
 * This is an internal design pattern used by AgentX core.
 * Most users don't need to implement custom Reactors.
 */

import type { ReactorContext } from "./ReactorContext";

/**
 * Reactor interface
 */
export interface Reactor {
  /**
   * Unique identifier
   */
  readonly id: string;

  /**
   * Human-readable name
   */
  readonly name: string;

  /**
   * Initialize the Reactor
   *
   * Subscribe to events and set up internal state here.
   */
  initialize(context: ReactorContext): void | Promise<void>;

  /**
   * Destroy the Reactor
   *
   * Unsubscribe from events and clean up resources here.
   */
  destroy(): void | Promise<void>;
}
