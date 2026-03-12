/**
 * CircuitBreaker — Protects against cascading failures
 *
 * Three states:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Failures exceeded threshold, requests rejected immediately
 * - HALF_OPEN: After cooldown, one probe request allowed through
 */

import { AgentXError } from "./AgentXError";

// ============================================================================
// Types
// ============================================================================

export type CircuitState = "closed" | "open" | "half_open";

export interface CircuitBreakerOptions {
  /** Number of consecutive failures before opening (default: 5) */
  failureThreshold?: number;
  /** Time in ms before transitioning from open to half-open (default: 30000) */
  resetTimeout?: number;
}

export type CircuitBreakerEventHandler = (state: CircuitState, error?: AgentXError) => void;

// ============================================================================
// CircuitBreaker
// ============================================================================

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private onStateChange?: CircuitBreakerEventHandler;

  constructor(options?: CircuitBreakerOptions) {
    this.failureThreshold = options?.failureThreshold ?? 5;
    this.resetTimeout = options?.resetTimeout ?? 30_000;
  }

  /**
   * Register a state change handler
   */
  onChange(handler: CircuitBreakerEventHandler): void {
    this.onStateChange = handler;
  }

  /**
   * Check if a request should be allowed through
   */
  canExecute(): boolean {
    if (this.state === "closed") return true;

    if (this.state === "open") {
      // Check if cooldown has elapsed
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.transition("half_open");
        return true; // Allow one probe request
      }
      return false;
    }

    // half_open — allow the probe
    return true;
  }

  /**
   * Record a successful execution
   */
  recordSuccess(): void {
    if (this.state === "half_open" || this.state === "closed") {
      this.failureCount = 0;
      if (this.state !== "closed") {
        this.transition("closed");
      }
    }
  }

  /**
   * Record a failed execution
   */
  recordFailure(error?: Error): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === "half_open") {
      // Probe failed, re-open
      this.transition("open", error);
    } else if (this.failureCount >= this.failureThreshold) {
      this.transition("open", error);
    }
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get current failure count
   */
  getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * Reset the circuit breaker to closed state
   */
  reset(): void {
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.transition("closed");
  }

  private transition(newState: CircuitState, causeError?: Error): void {
    const oldState = this.state;
    if (oldState === newState) return;

    this.state = newState;

    let agentXError: AgentXError | undefined;
    if (newState === "open") {
      agentXError = new AgentXError({
        code: "CIRCUIT_OPEN",
        category: "driver",
        message: `Circuit breaker open: ${this.failureCount} consecutive failures`,
        recoverable: false,
        cause: causeError,
      });
    }

    this.onStateChange?.(newState, agentXError);
  }
}
