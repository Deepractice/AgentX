/**
 * @agentxjs/core/error
 *
 * Top-level error types for the AgentX framework.
 */

export {
  AgentXError,
  type AgentXErrorCategory,
  AgentXErrorCode,
  type AgentXErrorCodeType,
  type AgentXErrorContext,
} from "./AgentXError";
export {
  CircuitBreaker,
  type CircuitBreakerEventHandler,
  type CircuitBreakerOptions,
  type CircuitState,
} from "./CircuitBreaker";
