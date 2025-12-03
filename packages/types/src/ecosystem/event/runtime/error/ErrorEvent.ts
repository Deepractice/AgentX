import type { RuntimeEvent } from "../RuntimeEvent";

/**
 * Event indicating an error has occurred.
 * Converted from ErrorEvent (Domain Event).
 */
export interface ErrorEnvEvent extends RuntimeEvent<"error", ErrorEnvEventData> {}

export interface ErrorEnvEventData {
  /** The agent that encountered the error (if applicable) */
  readonly agentId?: string;

  /** Error code */
  readonly code: string;

  /** Error message */
  readonly message: string;

  /** Error details (optional) */
  readonly details?: unknown;

  /** Whether the error is recoverable */
  readonly recoverable?: boolean;
}
