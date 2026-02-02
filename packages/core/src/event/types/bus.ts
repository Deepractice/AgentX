/**
 * EventBus Interfaces - EventBus, EventProducer, EventConsumer
 *
 * Central event bus interfaces for ecosystem communication.
 */

import type { BusEvent } from "./base";
import type {
  CommandEventMap,
  CommandRequestType,
  ResponseEventFor,
  RequestDataFor,
} from "./command";

// ============================================================================
// Types for Event Subscription
// ============================================================================

/**
 * Unsubscribe function type
 */
export type Unsubscribe = () => void;

/**
 * Event handler function type
 */
export type BusEventHandler<E extends BusEvent = BusEvent> = (event: E) => void;

/**
 * Subscription options for advanced event handling
 */
export interface SubscribeOptions<E extends BusEvent = BusEvent> {
  /**
   * Event filter - only events returning true will trigger the handler
   * Useful for filtering by agentId, sessionId, etc.
   */
  filter?: (event: E) => boolean;

  /**
   * Priority - higher numbers execute first (default: 0)
   * Useful for ensuring certain handlers run before others
   */
  priority?: number;

  /**
   * Whether to trigger only once then auto-unsubscribe
   */
  once?: boolean;
}

// ============================================================================
// EventProducer Interface (Write-only view)
// ============================================================================

/**
 * EventProducer interface - Write-only view
 *
 * Used by components that produce events:
 * - Effector (emits DriveableEvents from Claude API)
 * - Receptor (emits stream events)
 * - Agent (emits state/message events)
 *
 * Producer can only emit events, cannot subscribe.
 * This prevents accidental event loops and clarifies data flow.
 *
 * @example
 * ```typescript
 * class Effector {
 *   constructor(private producer: EventProducer) {}
 *
 *   async sendMessage(message: UserMessage) {
 *     // Can only emit, cannot subscribe
 *     this.producer.emit({
 *       type: "message_start",
 *       timestamp: Date.now(),
 *       data: { messageId: "msg-1", model: "claude" },
 *     });
 *   }
 * }
 * ```
 */
export interface EventProducer {
  /**
   * Emit a single event to the bus
   *
   * @param event - The event to emit
   */
  emit(event: BusEvent): void;

  /**
   * Emit multiple events (batch operation)
   *
   * @param events - Array of events to emit
   */
  emitBatch(events: BusEvent[]): void;

  /**
   * Emit a typed command event
   *
   * @param type - The command event type
   * @param data - Event data (type-checked)
   */
  emitCommand<T extends keyof CommandEventMap>(type: T, data: CommandEventMap[T]["data"]): void;
}

// ============================================================================
// EventConsumer Interface (Read-only view)
// ============================================================================

/**
 * EventConsumer interface - Read-only view
 *
 * Used by components that consume events:
 * - BusDriver (subscribes to DriveableEvents)
 * - UI components (subscribes to display events)
 * - Presenters (subscribes to forward events)
 *
 * Consumer can only subscribe to events, cannot emit.
 * This prevents accidental event emission and clarifies data flow.
 *
 * @example
 * ```typescript
 * class BusDriver {
 *   constructor(private consumer: EventConsumer) {}
 *
 *   async *receive(message: UserMessage) {
 *     // Can only subscribe, cannot emit
 *     this.consumer.on('message_start', (event) => {
 *       console.log('Received:', event.type);
 *     });
 *   }
 * }
 * ```
 */
export interface EventConsumer {
  /**
   * Subscribe to a specific event type
   *
   * @param type - The event type to listen for
   * @param handler - Callback invoked when event is received
   * @param options - Subscription options (filter, priority, once)
   * @returns Unsubscribe function
   */
  on<T extends string>(
    type: T,
    handler: BusEventHandler<BusEvent & { type: T }>,
    options?: SubscribeOptions<BusEvent & { type: T }>
  ): Unsubscribe;

  /**
   * Subscribe to multiple event types
   *
   * @param types - Array of event types to listen for
   * @param handler - Callback invoked when any matching event is received
   * @param options - Subscription options
   * @returns Unsubscribe function
   */
  on(types: string[], handler: BusEventHandler, options?: SubscribeOptions): Unsubscribe;

  /**
   * Subscribe to all events
   *
   * @param handler - Callback invoked for every event
   * @param options - Subscription options
   * @returns Unsubscribe function
   */
  onAny(handler: BusEventHandler, options?: SubscribeOptions): Unsubscribe;

  /**
   * Subscribe to an event type once (auto-unsubscribes after first trigger)
   *
   * @param type - Event type to subscribe to
   * @param handler - Callback function
   * @returns Unsubscribe function
   */
  once<T extends string>(type: T, handler: BusEventHandler<BusEvent & { type: T }>): Unsubscribe;

  /**
   * Subscribe to a CommandEvent with full type safety
   *
   * @example
   * ```typescript
   * consumer.onCommand("container_create_request", (event) => {
   *   event.data.requestId;    // string
   *   event.data.containerId;  // string
   * });
   * ```
   *
   * @param type - The command event type
   * @param handler - Callback with fully typed event
   * @returns Unsubscribe function
   */
  onCommand<T extends keyof CommandEventMap>(
    type: T,
    handler: (event: CommandEventMap[T]) => void
  ): Unsubscribe;

  /**
   * Send a command request and wait for response
   *
   * Automatically generates requestId, emits request, waits for matching response.
   *
   * @example
   * ```typescript
   * const response = await consumer.request("container_create_request", {
   *   containerId: "my-container"
   * });
   * // response is ContainerCreateResponse
   * console.log(response.data.containerId);
   * ```
   *
   * @param type - The request event type
   * @param data - Request data (without requestId)
   * @param timeout - Timeout in milliseconds (default: 30000)
   * @returns Promise of response event
   */
  request<T extends CommandRequestType>(
    type: T,
    data: RequestDataFor<T>,
    timeout?: number
  ): Promise<ResponseEventFor<T>>;
}

// ============================================================================
// EventBus Interface (Full access)
// ============================================================================

/**
 * EventBus interface - Central event bus for ecosystem communication.
 *
 * Extends both Producer and Consumer interfaces for internal use.
 * External components should use restricted views via asProducer/asConsumer.
 *
 * @example
 * ```typescript
 * const bus = new EventBus();
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
export interface EventBusInterface {
  /**
   * Emit an event to the bus.
   *
   * All subscribed handlers will receive this event.
   *
   * @param event - The event to emit
   */
  emit(event: BusEvent): void;

  /**
   * Emit multiple events (batch operation).
   *
   * @param events - Array of events to emit
   */
  emitBatch(events: BusEvent[]): void;

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
    handler: BusEventHandler<BusEvent & { type: T }>,
    options?: SubscribeOptions<BusEvent & { type: T }>
  ): Unsubscribe;

  /**
   * Subscribe to multiple event types.
   *
   * @param types - Array of event types to listen for
   * @param handler - Callback invoked when any matching event is received
   * @param options - Subscription options
   * @returns Unsubscribe function
   */
  on(types: string[], handler: BusEventHandler, options?: SubscribeOptions): Unsubscribe;

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
  once<T extends string>(type: T, handler: BusEventHandler<BusEvent & { type: T }>): Unsubscribe;

  /**
   * Subscribe to a CommandEvent with full type safety.
   *
   * @example
   * ```typescript
   * bus.onCommand("container_create_request", (event) => {
   *   event.data.requestId;    // string
   *   event.data.containerId;  // string
   * });
   * ```
   *
   * @param type - The command event type
   * @param handler - Callback with fully typed event
   * @returns Unsubscribe function
   */
  onCommand<T extends keyof CommandEventMap>(
    type: T,
    handler: (event: CommandEventMap[T]) => void
  ): Unsubscribe;

  /**
   * Emit a CommandEvent with full type safety.
   *
   * @example
   * ```typescript
   * bus.emitCommand("container_create_request", {
   *   requestId: "req_123",
   *   containerId: "my-container"
   * });
   * ```
   *
   * @param type - The command event type
   * @param data - Event data (type-checked)
   */
  emitCommand<T extends keyof CommandEventMap>(type: T, data: CommandEventMap[T]["data"]): void;

  /**
   * Send a command request and wait for response.
   *
   * Automatically generates requestId, emits request, waits for matching response.
   *
   * @example
   * ```typescript
   * const response = await bus.request("container_create_request", {
   *   containerId: "my-container"
   * });
   * // response is ContainerCreateResponse
   * console.log(response.data.containerId);
   * ```
   *
   * @param type - The request event type
   * @param data - Request data (without requestId)
   * @param timeout - Timeout in milliseconds (default: 30000)
   * @returns Promise of response event
   */
  request<T extends CommandRequestType>(
    type: T,
    data: RequestDataFor<T>,
    timeout?: number
  ): Promise<ResponseEventFor<T>>;

  /**
   * Get a read-only consumer view of the bus.
   *
   * Use this to safely expose event subscription to external code
   * without allowing them to emit events.
   *
   * @example
   * ```typescript
   * class BusDriver {
   *   constructor(consumer: EventConsumer) {
   *     // Can only subscribe, cannot emit
   *     consumer.on('text_delta', ...);
   *   }
   * }
   * ```
   *
   * @returns EventConsumer - Read-only view
   */
  asConsumer(): EventConsumer;

  /**
   * Get a write-only producer view of the bus.
   *
   * Use this to give components the ability to emit events
   * without exposing subscription capabilities.
   *
   * @example
   * ```typescript
   * class ClaudeReceptor {
   *   constructor(producer: EventProducer) {
   *     // Can only emit, cannot subscribe
   *     producer.emit({ type: 'text_delta', ... });
   *   }
   * }
   * ```
   *
   * @returns EventProducer - Write-only view
   */
  asProducer(): EventProducer;

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
