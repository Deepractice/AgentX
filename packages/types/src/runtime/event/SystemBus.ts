/**
 * SystemBus - Central event bus for the ecosystem.
 *
 * All components communicate through the SystemBus:
 * - Environment emits EnvironmentEvents (text_chunk, stream_start, etc.)
 * - Agent emits AgentEvents (state changes, messages, etc.)
 * - Session, Container emit their respective events
 *
 * Features:
 * - Type-safe event subscription
 * - Custom filters
 * - Priority-based execution order
 * - One-time subscriptions
 *
 * @example
 * ```typescript
 * const bus = new SystemBusImpl();
 *
 * // Subscribe to specific event type
 * bus.on('text_chunk', (e) => {
 *   console.log('Received text:', e.data.text);
 * });
 *
 * // Subscribe with options
 * bus.on('text_delta', handler, {
 *   filter: (e) => e.agentId === 'agent-1',
 *   priority: 10,
 *   once: true
 * });
 *
 * // Subscribe to all events
 * bus.onAny((e) => {
 *   console.log('Event:', e.type);
 * });
 *
 * // Emit event
 * bus.emit({ type: 'text_chunk', data: { text: 'Hello' } });
 * ```
 */

import type { SystemEvent } from "./base";

/**
 * Unsubscribe function type.
 */
export type Unsubscribe = () => void;

/**
 * Event handler function type.
 */
export type BusEventHandler<E extends SystemEvent = SystemEvent> = (event: E) => void;

/**
 * Subscription options for advanced event handling.
 */
export interface SubscribeOptions<E extends SystemEvent = SystemEvent> {
  /**
   * Event filter - only events returning true will trigger the handler.
   * Useful for filtering by agentId, sessionId, etc.
   */
  filter?: (event: E) => boolean;

  /**
   * Priority - higher numbers execute first (default: 0).
   * Useful for ensuring certain handlers run before others.
   */
  priority?: number;

  /**
   * Whether to trigger only once then auto-unsubscribe.
   */
  once?: boolean;
}

/**
 * SystemBus interface - Central event bus for ecosystem communication.
 */
export interface SystemBus {
  /**
   * Emit an event to the bus.
   *
   * All subscribed handlers will receive this event.
   *
   * @param event - The event to emit
   */
  emit(event: SystemEvent): void;

  /**
   * Emit multiple events (batch operation).
   *
   * @param events - Array of events to emit
   */
  emitBatch(events: SystemEvent[]): void;

  /**
   * Subscribe to a specific event type.
   *
   * @param type - The event type to listen for
   * @param handler - Callback invoked when event is received
   * @param options - Subscription options (filter, priority, once)
   * @returns Unsubscribe function
   */
  on<T extends string>(
    type: T,
    handler: BusEventHandler<SystemEvent & { type: T }>,
    options?: SubscribeOptions<SystemEvent & { type: T }>
  ): Unsubscribe;

  /**
   * Subscribe to multiple event types.
   *
   * @param types - Array of event types to listen for
   * @param handler - Callback invoked when any matching event is received
   * @param options - Subscription options
   * @returns Unsubscribe function
   */
  on(
    types: string[],
    handler: BusEventHandler,
    options?: SubscribeOptions
  ): Unsubscribe;

  /**
   * Subscribe to all events.
   *
   * @param handler - Callback invoked for every event
   * @param options - Subscription options
   * @returns Unsubscribe function
   */
  onAny(handler: BusEventHandler, options?: SubscribeOptions): Unsubscribe;

  /**
   * Subscribe to an event type once (auto-unsubscribes after first trigger).
   *
   * @param type - Event type to subscribe to
   * @param handler - Callback function
   * @returns Unsubscribe function
   */
  once<T extends string>(
    type: T,
    handler: BusEventHandler<SystemEvent & { type: T }>
  ): Unsubscribe;

  /**
   * Destroy the bus and clean up resources.
   *
   * All subscriptions will be terminated.
   * After calling destroy():
   * - All subscriptions are removed
   * - New emissions are ignored
   * - New subscriptions are no-ops
   */
  destroy(): void;
}
