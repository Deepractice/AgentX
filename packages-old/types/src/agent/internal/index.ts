/**
 * Internal Agent Types
 *
 * These are types used internally by the agent package implementation.
 * Users typically don't need to use these directly.
 *
 * Import from: @agentxjs/types/agent/internal
 */

// Middleware & Interceptor
export type { AgentMiddleware, AgentMiddlewareNext } from "./AgentMiddleware";
export type { AgentInterceptor, AgentInterceptorNext } from "./AgentInterceptor";

// Event handling (also re-exported from public for convenience)
export type { AgentOutputCallback, AgentEventHandler, Unsubscribe } from "./AgentOutputCallback";

// State Machine
export type { AgentStateMachine } from "./AgentStateMachine";
