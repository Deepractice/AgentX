/**
 * ID Generation Utilities
 *
 * Provides consistent ID generation patterns across the AgentX platform.
 *
 * @packageDocumentation
 */

/**
 * Generate a unique request ID for command request/response correlation.
 *
 * Format: `req_{timestamp}_{random}`
 *
 * @example
 * ```typescript
 * const requestId = generateRequestId();
 * // => "req_1704067200000_a1b2c3"
 * ```
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Generate a unique ID with a custom prefix.
 *
 * Format: `{prefix}_{timestamp}_{random}`
 *
 * @param prefix - The prefix for the ID (e.g., "msg", "agent", "session")
 *
 * @example
 * ```typescript
 * const msgId = generateId("msg");
 * // => "msg_1704067200000_a1b2c3"
 *
 * const agentId = generateId("agent");
 * // => "agent_1704067200000_x7y8z9"
 * ```
 */
export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
