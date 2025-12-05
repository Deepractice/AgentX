/**
 * Agent - Event Processing Unit
 *
 * Agent is a logical processing unit independent of Runtime system.
 * It can be tested in isolation with mock Driver and Presenter.
 *
 * ## Architecture
 *
 * ```text
 * Driver (event producer)
 *     ↓ Stream Events
 *   Agent (logical processor)
 *     - Engine: event assembly (Mealy Machine)
 *     - State: state management
 *     - Lifecycle: lifecycle management
 *     ↓ Processed Events
 * Presenter (event consumer)
 * ```
 *
 * ## Key Design
 *
 * - Agent is independent of Runtime (Container, Session, Bus)
 * - Driver produces events, Presenter consumes events
 * - Engine is internal (created automatically)
 * - Middleware intercepts incoming messages
 * - Interceptor intercepts outgoing events
 *
 * ## Usage
 *
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

// Core interface & factory
export type {
  Agent,
  CreateAgentOptions,
  StateChange,
  StateChangeHandler,
  EventHandlerMap,
  ReactHandlerMap,
} from "./Agent";
export { createAgent } from "./Agent";

// Driver & Presenter
export type { AgentDriver } from "./AgentDriver";
export type { AgentPresenter } from "./AgentPresenter";

// Output
export type { AgentOutput } from "./AgentOutput";

// Lifecycle & State
export type { AgentLifecycle } from "./AgentLifecycle";
export type { AgentState } from "./AgentState";

// Error types
export type { AgentError, AgentErrorCategory } from "./AgentError";

// Message Queue
export type { MessageQueue } from "./MessageQueue";

// Event handling
export type { AgentEventHandler, Unsubscribe } from "./AgentEventHandler";

// Middleware & Interceptor
export type { AgentMiddleware, AgentMiddlewareNext } from "./AgentMiddleware";
export type { AgentInterceptor, AgentInterceptorNext } from "./AgentInterceptor";

// Message types
export type {
  UserMessage,
  AssistantMessage,
  ToolCallMessage,
  ToolResultMessage,
  Message,
  ContentPart,
  TextPart,
  ImagePart,
  ToolCallPart,
  ToolResultPart,
} from "./message";

// Event types
export * from "./event";
