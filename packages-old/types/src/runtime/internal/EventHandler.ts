/**
 * EventHandler - Event handler related types
 *
 * Types for the event handler system.
 */

import type { EventSource } from "~/event/base";

/**
 * Error context for error handling
 *
 * Provides context information when handling errors in event handlers.
 */
export interface ErrorContext {
  /**
   * Event source that triggered the error
   */
  source?: EventSource;

  /**
   * Request ID (if error is related to a request)
   */
  requestId?: string;

  /**
   * Error severity
   */
  severity?: "info" | "warn" | "error" | "fatal";

  /**
   * Operation name (for logging and debugging)
   */
  operation?: string;

  /**
   * Additional error details
   */
  details?: Record<string, unknown>;

  /**
   * Optional callback to handle error (e.g., emit error response)
   */
  onError?: (err: unknown) => void;
}
