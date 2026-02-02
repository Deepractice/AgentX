/**
 * Engine Types - AgentEngine, Driver, Presenter, and related infrastructure
 *
 * This file defines:
 * - MessageQueue: Read-only view of message queue state
 * - AgentEngine: Event processing unit interface
 * - AgentDriver: Input adapter for external events
 * - AgentPresenter: Output adapter for external systems
 * - Middleware and Interceptor types
 * - StateMachine interface
 * - CreateAgentOptions: Factory options
 *
 * @packageDocumentation
 */

import type { UserMessage } from "./message";
import type {
  AgentState,
  AgentOutput,
  StreamEvent,
  Unsubscribe,
  AgentOutputCallback,
} from "./event";

// =============================================================================
// Message Queue
// =============================================================================

/**
 * MessageQueue interface
 *
 * Read-only view of the message queue state.
 */
export interface MessageQueue {
  /**
   * Number of messages in queue
   */
  readonly length: number;

  /**
   * Whether queue is empty
   */
  readonly isEmpty: boolean;
}

// =============================================================================
// Middleware & Interceptor
// =============================================================================

/**
 * Next function to continue the middleware chain
 */
export type AgentMiddlewareNext = (message: UserMessage) => Promise<void>;

/**
 * Middleware function type
 *
 * @param message - The user message being processed
 * @param next - Call to continue to next middleware or actual receive
 */
export type AgentMiddleware = (message: UserMessage, next: AgentMiddlewareNext) => Promise<void>;

/**
 * Next function to continue the interceptor chain
 */
export type AgentInterceptorNext = (event: AgentOutput) => void;

/**
 * Interceptor function type
 *
 * @param event - The event being dispatched
 * @param next - Call to continue to next interceptor or actual dispatch
 */
export type AgentInterceptor = (event: AgentOutput, next: AgentInterceptorNext) => void;

// =============================================================================
// State Machine
// =============================================================================

/**
 * State change event payload
 */
export interface StateChange {
  prev: AgentState;
  current: AgentState;
}

/**
 * State change handler type
 */
export type StateChangeHandler = (change: StateChange) => void;

/**
 * AgentStateMachine interface
 *
 * Processes StateEvents to update internal agent state and notify subscribers.
 */
export interface AgentStateMachineInterface {
  /**
   * Current agent state
   */
  readonly state: AgentState;

  /**
   * Process a StateEvent and update internal state
   *
   * @param event - StateEvent from MealyMachine
   */
  process(event: AgentOutput): void;

  /**
   * Subscribe to state changes
   *
   * @param handler - Callback receiving { prev, current } state change
   * @returns Unsubscribe function
   */
  onStateChange(handler: StateChangeHandler): Unsubscribe;

  /**
   * Reset state machine (used on destroy)
   */
  reset(): void;
}

// =============================================================================
// Event Handler Maps
// =============================================================================

/**
 * Event handler map for batch subscription
 *
 * Generic handler map - concrete event types are defined in runtime/event.
 * AgentEngine package is independent of specific event type definitions.
 *
 * Usage:
 * ```typescript
 * engine.on({
 *   text_delta: (event) => console.log(event.data.text),
 *   assistant_message: (event) => setMessages(prev => [...prev, event.data]),
 * });
 * ```
 */
export type EventHandlerMap = Record<string, ((event: AgentOutput) => void) | undefined>;

/**
 * React-style handler map for fluent event subscription
 *
 * Generic handler map - concrete event types are defined in runtime/event.
 * AgentEngine package is independent of specific event type definitions.
 *
 * Usage:
 * ```typescript
 * engine.react({
 *   onTextDelta: (event) => console.log(event.data.text),
 *   onAssistantMessage: (event) => setMessages(prev => [...prev, event.data]),
 * });
 * ```
 */
export type ReactHandlerMap = Record<string, ((event: AgentOutput) => void) | undefined>;

// =============================================================================
// Agent Engine
// =============================================================================

/**
 * AgentEngine interface - Event Processing Unit
 *
 * Core responsibilities:
 * - State management (AgentState)
 * - Event subscription and distribution
 * - Middleware/Interceptor chain
 */
export interface AgentEngine {
  /**
   * Unique agent instance ID
   */
  readonly agentId: string;

  /**
   * Creation timestamp
   */
  readonly createdAt: number;

  /**
   * Current conversation state
   */
  readonly state: AgentState;

  /**
   * Message queue for pending messages
   */
  readonly messageQueue: MessageQueue;

  /**
   * Receive a message from user
   *
   * @param message - String content or UserMessage object
   * @deprecated Use handleStreamEvent for push-based event processing
   */
  receive(message: string | UserMessage): Promise<void>;

  /**
   * Handle a stream event from the driver
   *
   * This is the push-based API for event processing.
   * Events are pushed by BusDriver when DriveableEvents arrive.
   *
   * @param event - StreamEvent to process through MealyMachine
   */
  handleStreamEvent(event: StreamEvent): void;

  /**
   * Subscribe to all events
   */
  on(handler: AgentOutputCallback): Unsubscribe;

  /**
   * Batch subscribe to multiple event types
   */
  on(handlers: EventHandlerMap): Unsubscribe;

  /**
   * Subscribe to specific event type by name
   */
  on(type: string, handler: AgentOutputCallback): Unsubscribe;

  /**
   * Subscribe to multiple event types by name
   */
  on(types: string[], handler: AgentOutputCallback): Unsubscribe;

  /**
   * Subscribe to state changes
   *
   * @param handler - Callback receiving { prev, current } state change
   * @returns Unsubscribe function
   */
  onStateChange(handler: StateChangeHandler): Unsubscribe;

  /**
   * React-style fluent event subscription
   */
  react(handlers: ReactHandlerMap): Unsubscribe;

  /**
   * Subscribe to agent ready event
   *
   * Called when agent is ready to receive messages.
   * If already ready, handler is called immediately.
   */
  onReady(handler: () => void): Unsubscribe;

  /**
   * Subscribe to agent destroy event
   *
   * Called when agent is destroyed.
   */
  onDestroy(handler: () => void): Unsubscribe;

  /**
   * Add middleware to intercept incoming messages (receive side)
   */
  use(middleware: AgentMiddleware): Unsubscribe;

  /**
   * Add interceptor to intercept outgoing events (event side)
   */
  intercept(interceptor: AgentInterceptor): Unsubscribe;

  /**
   * Interrupt - User-initiated stop
   *
   * Stops the current operation gracefully.
   * The agent will return to idle state.
   */
  interrupt(): void;

  /**
   * Destroy - Clean up resources
   */
  destroy(): Promise<void>;
}

// =============================================================================
// Source & Presenter (EventBus adapters)
// =============================================================================

/**
 * AgentSource interface
 *
 * Subscribes to EventBus for StreamEvents and forwards them to AgentEngine.
 * This is the input adapter: EventBus → AgentEngine
 *
 * ```
 * EventBus ──subscribe──► Source ──handleStreamEvent──► AgentEngine
 * ```
 */
export interface AgentSource {
  /**
   * Source name (for identification and logging)
   */
  readonly name: string;

  /**
   * Connect to EventBus and start forwarding StreamEvents
   *
   * @param onEvent - Callback to invoke when StreamEvent is received
   */
  connect(onEvent: (event: StreamEvent) => void): void;

  /**
   * Disconnect from EventBus
   */
  disconnect(): void;
}

/**
 * AgentPresenter interface
 *
 * Publishes AgentOutput to EventBus.
 * This is the output adapter: AgentEngine → EventBus
 *
 * ```
 * AgentEngine ──present──► Presenter ──emit──► EventBus
 * ```
 */
export interface AgentPresenter {
  /**
   * Presenter name (for identification and logging)
   */
  readonly name: string;

  /**
   * Publish an agent output to EventBus
   *
   * @param agentId - The agent ID
   * @param output - The output to publish
   */
  present(agentId: string, output: AgentOutput): void;
}

// =============================================================================
// Factory Options
// =============================================================================

/**
 * EventBus interface (minimal subset needed by AgentEngine)
 */
export interface AgentEventBus {
  /**
   * Emit an event to the bus
   */
  emit(event: unknown): void;

  /**
   * Subscribe to events
   */
  on(type: string, handler: (event: unknown) => void): () => void;

  /**
   * Subscribe to all events
   */
  onAny(handler: (event: unknown) => void): () => void;
}

/**
 * Options for creating an AgentEngine
 */
export interface CreateAgentOptions {
  /**
   * Agent ID (optional, auto-generated if not provided)
   */
  agentId?: string;

  /**
   * EventBus connection
   * AgentEngine uses this to:
   * - emit user_message when receive() is called
   * - Source subscribes to StreamEvent
   * - Presenter emits AgentOutput
   */
  bus: AgentEventBus;

  /**
   * Source - Subscribes to EventBus, forwards StreamEvent to AgentEngine
   * Optional: default implementation subscribes to StreamEvent types
   */
  source?: AgentSource;

  /**
   * Presenter - Publishes AgentOutput to EventBus
   * Optional: default implementation emits to bus
   */
  presenter?: AgentPresenter;
}
