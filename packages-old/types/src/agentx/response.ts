/**
 * AgentXResponse - Unified response data structure
 *
 * All command response `data` fields should extend this type.
 * Provides unified base fields and extensibility.
 *
 * ## Design Philosophy
 *
 * - **Convention over Configuration**: Responses that include `__subscriptions`
 *   automatically trigger client-side session subscriptions
 * - **Extensible**: Future features (caching, tracing, deprecation) can be added
 *   without changing existing response definitions
 * - **Type-safe**: TypeScript ensures all responses have required fields
 *
 * ## Usage
 *
 * ```typescript
 * // Define a response data type
 * interface ImageCreateResponseData extends AgentXResponse {
 *   record: ImageRecord;
 * }
 *
 * // Server: Include subscriptions in response
 * createResponse("image_create_response", {
 *   requestId,
 *   record,
 *   __subscriptions: [record.sessionId],
 * });
 *
 * // Client: Automatically subscribes to sessions
 * // (handled by createRemoteAgentX)
 * ```
 *
 * @packageDocumentation
 */

// ============================================================================
// AgentXResponse - Base Response Data Type
// ============================================================================

/**
 * AgentXResponse - Base interface for all command response data
 *
 * All command response data types should extend this interface
 * to ensure consistent structure and enable automatic client-side handling.
 */
export interface AgentXResponse {
  // ========== Core Fields ==========

  /**
   * Request ID for correlation and tracking
   *
   * Links the response to its originating request.
   * Used for request-response matching and debugging.
   */
  requestId: string;

  /**
   * Error message if the request failed
   *
   * Undefined or absent means the request succeeded.
   * Present means the request failed, and this contains the error description.
   */
  error?: string;

  // ========== Client Instructions ==========

  /**
   * Session IDs that the client should subscribe to
   *
   * When present, the client will automatically subscribe to these sessions
   * to receive real-time events. This solves the reconnection event loss problem.
   *
   * @example
   * ```typescript
   * // Single session (e.g., image_create_response)
   * { __subscriptions: [record.sessionId] }
   *
   * // Multiple sessions (e.g., image_list_response)
   * { __subscriptions: records.map(r => r.sessionId) }
   * ```
   */
  __subscriptions?: string[];

  // ========== Future Extensions (Reserved) ==========

  // /**
  //  * Cache control instructions
  //  *
  //  * Tells the client to cache this response.
  //  */
  // __cache?: {
  //   /** Cache key */
  //   key: string;
  //   /** Time-to-live in seconds */
  //   ttl: number;
  // };

  // /**
  //  * Cache invalidation instructions
  //  *
  //  * Tells the client to invalidate these cache keys.
  //  */
  // __invalidate?: string[];

  // /**
  //  * Distributed tracing information
  //  */
  // __trace?: {
  //   traceId: string;
  //   spanId: string;
  // };

  // /**
  //  * API deprecation warning
  //  *
  //  * Warns the client that this API is deprecated.
  //  */
  // __deprecation?: {
  //   message: string;
  //   alternative?: string;
  //   removeAt?: string;  // version
  // };
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a response has subscriptions
 */
export function hasSubscriptions(
  response: AgentXResponse
): response is AgentXResponse & { __subscriptions: string[] } {
  return Array.isArray(response.__subscriptions) && response.__subscriptions.length > 0;
}

/**
 * Check if a response indicates an error
 */
export function isErrorResponse(response: AgentXResponse): boolean {
  return typeof response.error === "string" && response.error.length > 0;
}
