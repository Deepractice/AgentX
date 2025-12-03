/**
 * SystemBus - Central event bus for the ecosystem.
 *
 * All Reactors communicate through the SystemBus:
 * - Environment emits EnvironmentEvent
 * - Receptor transforms EnvironmentEvent → RuntimeEvent
 * - UI/Logger/Monitor subscribe to RuntimeEvent
 *
 * The SystemBus is the Ecosystem-level bus, separate from AgentEventBus
 * which is internal to each Agent.
 *
 * @example
 * ```typescript
 * const bus = new SystemBus();
 *
 * // Subscribe to specific event type
 * bus.on('text_chunk', (e) => {
 *   console.log('Received text:', e.text);
 * });
 *
 * // Subscribe to all events
 * bus.onAny((e) => {
 *   console.log('Event:', e.type);
 * });
 *
 * // Emit event
 * bus.emit({ type: 'text_chunk', text: 'Hello' });
 * ```
 */

/**
 * Unsubscribe function type.
 */
export type Unsubscribe = () => void;

/**
 * Base event interface for SystemBus.
 * All events on the bus must have a type field.
 */
export interface BusEvent {
  readonly type: string;
}

/**
 * Event handler function type.
 */
export type BusEventHandler<E extends BusEvent = BusEvent> = (event: E) => void;

/**
 * SystemBus interface - Central event bus for Reactor communication.
 */
export interface SystemBus {
  /**
   * Emit an event to the bus.
   *
   * All subscribed handlers will receive this event.
   *
   * @param event - The event to emit
   */
  emit(event: BusEvent): void;

  /**
   * Subscribe to a specific event type.
   *
   * @param type - The event type to listen for
   * @param handler - Callback invoked when event is received
   * @returns Unsubscribe function
   */
  on<T extends string>(
    type: T,
    handler: BusEventHandler<BusEvent & { type: T }>
  ): Unsubscribe;

  /**
   * Subscribe to all events.
   *
   * @param handler - Callback invoked for every event
   * @returns Unsubscribe function
   */
  onAny(handler: BusEventHandler): Unsubscribe;

  /**
   * Destroy the bus and clean up resources.
   *
   * All subscriptions will be terminated.
   */
  destroy(): void;
}
