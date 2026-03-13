/**
 * AgentXError — Top-level error type for the AgentX framework
 *
 * Like AgentXPlatform, this is a core-level type that all layers use.
 * Provides structured error classification with category, code, and recoverability.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Error category — which layer produced the error
 */
export type AgentXErrorCategory = "driver" | "persistence" | "connection" | "runtime";

/**
 * Error context — scope information for debugging
 */
export interface AgentXErrorContext {
  instanceId?: string;
  sessionId?: string;
  imageId?: string;
  containerId?: string;
  messageId?: string;
}

// ============================================================================
// Error Codes
// ============================================================================

/**
 * Well-known error codes
 */
export const AgentXErrorCode = {
  // Driver
  DRIVER_ERROR: "DRIVER_ERROR",
  CIRCUIT_OPEN: "CIRCUIT_OPEN",

  // Persistence
  PERSISTENCE_FAILED: "PERSISTENCE_FAILED",

  // Connection
  CONNECTION_FAILED: "CONNECTION_FAILED",
  CONNECTION_TIMEOUT: "CONNECTION_TIMEOUT",

  // Runtime
  RUNTIME_ERROR: "RUNTIME_ERROR",
} as const;

export type AgentXErrorCodeType = (typeof AgentXErrorCode)[keyof typeof AgentXErrorCode];

// ============================================================================
// AgentXError Class
// ============================================================================

/**
 * AgentXError — structured error for all AgentX layers
 *
 * @example
 * ```typescript
 * import { AgentXError } from "@agentxjs/core/error";
 *
 * throw new AgentXError({
 *   code: "PERSISTENCE_FAILED",
 *   category: "persistence",
 *   message: "Failed to persist assistant message",
 *   recoverable: true,
 *   context: { instanceId: "agent_123", sessionId: "sess_456" },
 *   cause: originalError,
 * });
 * ```
 */
export class AgentXError extends Error {
  readonly code: string;
  readonly category: AgentXErrorCategory;
  readonly recoverable: boolean;
  readonly context?: AgentXErrorContext;

  constructor(options: {
    code: string;
    category: AgentXErrorCategory;
    message: string;
    recoverable: boolean;
    context?: AgentXErrorContext;
    cause?: Error;
  }) {
    super(options.message, { cause: options.cause });
    this.name = "AgentXError";
    this.code = options.code;
    this.category = options.category;
    this.recoverable = options.recoverable;
    this.context = options.context;
  }
}
