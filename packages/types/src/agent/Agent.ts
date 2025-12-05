/**
 * Agent - Event Processing Unit
 *
 * Agent is a logical processing unit that coordinates:
 * - Driver: Event producer (LLM interaction)
 * - Engine: Event assembler (Mealy Machine)
 * - Presenter: Event consumer (side effects)
 *
 * ```text
 * Driver (event producer)
 *     ↓ Stream Events
 *   Agent (logical processor)
 *     - Engine: event assembly
 *     - State: state management
 *     - Lifecycle: lifecycle management
 *     ↓ Processed Events
 * Presenter (event consumer)
 * ```
 *
 * Agent is independent of Runtime system (Container, Session, Bus).
 * It can be tested in isolation with mock Driver and Presenter.
 *
 * Lifecycle:
 * - running: Active, can receive messages
 * - destroyed: Removed from memory, cannot be used
 *
 * API:
 * - receive(message): Send message to agent
 * - on(handler): Subscribe to events
 * - interrupt(): User-initiated stop
 * - destroy(): Clean up resources
 */

import type { UserMessage } from "./message";
import type { AgentState } from "./AgentState";
import type { AgentLifecycle } from "./AgentLifecycle";
import type { AgentEventHandler, Unsubscribe } from "./AgentEventHandler";
import type { AgentMiddleware } from "./AgentMiddleware";
import type { AgentInterceptor } from "./AgentInterceptor";
import type { AgentOutput } from "./AgentOutput";
import type { AgentDriver } from "./AgentDriver";
import type { AgentPresenter } from "./AgentPresenter";

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
 * Event handler map for batch subscription
 *
 * Generic handler map - concrete event types are defined in runtime/event.
 * Agent package is independent of specific event type definitions.
 *
 * Usage:
 * ```typescript
 * agent.on({
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
 * Agent package is independent of specific event type definitions.
 *
 * Usage:
 * ```typescript
 * agent.react({
 *   onTextDelta: (event) => console.log(event.data.text),
 *   onAssistantMessage: (event) => setMessages(prev => [...prev, event.data]),
 * });
 * ```
 */
export type ReactHandlerMap = Record<string, ((event: AgentOutput) => void) | undefined>;

/**
 * Agent interface - Event Processing Unit
 *
 * Core responsibilities:
 * - State management (AgentState)
 * - Lifecycle management (AgentLifecycle)
 * - Event subscription and distribution
 * - Middleware/Interceptor chain
 */
export interface Agent {
  /**
   * Unique agent instance ID
   */
  readonly agentId: string;

  /**
   * Creation timestamp
   */
  readonly createdAt: number;

  /**
   * Current lifecycle state
   */
  readonly lifecycle: AgentLifecycle;

  /**
   * Current conversation state
   */
  readonly state: AgentState;

  /**
   * Receive a message from user
   *
   * @param message - String content or UserMessage object
   */
  receive(message: string | UserMessage): Promise<void>;

  /**
   * Subscribe to all events
   */
  on(handler: AgentEventHandler): Unsubscribe;

  /**
   * Batch subscribe to multiple event types
   */
  on(handlers: EventHandlerMap): Unsubscribe;

  /**
   * Subscribe to specific event type by name
   */
  on(type: string, handler: AgentEventHandler): Unsubscribe;

  /**
   * Subscribe to multiple event types by name
   */
  on(types: string[], handler: AgentEventHandler): Unsubscribe;

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
   * Called when agent lifecycle becomes 'running'.
   * If already running, handler is called immediately.
   */
  onReady(handler: () => void): Unsubscribe;

  /**
   * Subscribe to agent destroy event
   *
   * Called when agent lifecycle becomes 'destroyed'.
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

/**
 * Options for creating an Agent
 */
export interface CreateAgentOptions {
  /**
   * Driver - Event producer (LLM interaction)
   */
  driver: AgentDriver;

  /**
   * Presenter - Event consumer (side effects)
   */
  presenter: AgentPresenter;
}

/**
 * Factory function to create an Agent
 *
 * Agent is a logical processing unit that coordinates:
 * - Driver: produces stream events from LLM
 * - Engine: assembles events (internal, created automatically)
 * - Presenter: consumes processed events
 *
 * @example
 * ```typescript
 * const agent = createAgent({
 *   driver: new ClaudeDriver(config),
 *   presenter: new SSEPresenter(connection),
 * });
 *
 * agent.on("text_delta", (e) => console.log(e.data.text));
 * await agent.receive("Hello!");
 * ```
 */
export declare function createAgent(options: CreateAgentOptions): Agent;
