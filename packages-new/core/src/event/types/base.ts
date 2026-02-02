/**
 * Base Event Types - SystemEvent, EventSource, EventIntent, EventCategory, EventContext
 *
 * Foundation types for the event system.
 */

// ============================================================================
// SECTION 1: Legacy BusEvent Types (for backward compatibility)
// ============================================================================

/**
 * BusEvent - Base event type for EventBus
 *
 * All events flowing through the EventBus must conform to this structure.
 * This is a minimal event type that can be extended for specific use cases.
 *
 * @deprecated Use SystemEvent instead for full event system support
 */
export interface BusEvent<T extends string = string, D = unknown> {
  /**
   * Event type identifier (e.g., "text_delta", "assistant_message")
   */
  readonly type: T;

  /**
   * Event timestamp (Unix milliseconds)
   */
  readonly timestamp: number;

  /**
   * Event payload data
   */
  readonly data: D;

  /**
   * Event source (optional, for routing/filtering)
   */
  readonly source?: string;

  /**
   * Event category (optional, for classification)
   */
  readonly category?: string;

  /**
   * Event intent (optional, for command pattern)
   */
  readonly intent?: string;
}

// ============================================================================
// SECTION 2: Base Types (SystemEvent, EventSource, EventIntent, EventCategory)
// ============================================================================

/**
 * Event source - where the event originated
 */
export type EventSource =
  | "environment" // External world (Claude API, Network)
  | "agent" // Agent internal
  | "session" // Session operations
  | "container" // Container operations
  | "sandbox" // Sandbox resources (Workspace, MCP)
  | "command"; // Command request/response (API operations)

/**
 * Event intent - what the event represents
 */
export type EventIntent =
  | "request" // Request to perform action (may be forwarded or executed)
  | "result" // Result of completed action
  | "notification"; // State change notification (no action needed)

/**
 * Event category - fine-grained classification within source
 */
export type EventCategory =
  // Environment categories
  | "stream" // Streaming output from LLM
  | "connection" // Network connection status
  // Agent categories
  | "state" // State transitions
  | "message" // Complete messages
  | "turn" // Conversation turns
  | "error" // Errors
  // Session categories
  | "lifecycle" // Creation/destruction
  | "persist" // Persistence operations
  | "action" // User actions (resume, fork)
  // Sandbox categories
  | "workdir" // File operations
  | "mcp" // MCP tool operations
  // Command categories (API request/response)
  | "request" // Request to perform action
  | "response"; // Response with result

/**
 * EventContext - Scope information attached to events
 */
export interface EventContext {
  /**
   * Container ID (isolation boundary)
   */
  containerId?: string;

  /**
   * Image ID (persistent conversation identity)
   */
  imageId?: string;

  /**
   * Agent ID (if event is agent-scoped)
   */
  agentId?: string;

  /**
   * Session ID (if event is session-scoped)
   */
  sessionId?: string;

  /**
   * Turn ID (for correlating events within a single turn)
   * A turn = one user message + assistant response cycle
   */
  turnId?: string;

  /**
   * Correlation ID (for request-response tracking)
   */
  correlationId?: string;
}

/**
 * SystemEvent - Base interface for ALL events in the system
 *
 * Every event has:
 * - type: What happened (e.g., "text_delta", "session_saved")
 * - timestamp: When it happened
 * - data: Event payload
 * - source: Where it came from
 * - category: What kind of event
 * - intent: What it means (notification/request/result)
 * - context: Optional scope information
 * - broadcastable: Whether to broadcast to external clients (default: true)
 */
export interface SystemEvent<
  T extends string = string,
  D = unknown,
  S extends EventSource = EventSource,
  C extends EventCategory = EventCategory,
  I extends EventIntent = EventIntent,
> {
  /**
   * Event type identifier (e.g., "text_delta", "session_saved")
   */
  readonly type: T;

  /**
   * Event timestamp (Unix milliseconds)
   */
  readonly timestamp: number;

  /**
   * Event payload data
   */
  readonly data: D;

  /**
   * Event source - where the event originated
   */
  readonly source: S;

  /**
   * Event category - fine-grained classification
   */
  readonly category: C;

  /**
   * Event intent - what the event represents
   */
  readonly intent: I;

  /**
   * Event context - scope information (optional)
   */
  readonly context?: EventContext;

  /**
   * Whether to broadcast this event to external clients (SSE/WebSocket)
   *
   * - true or undefined: Broadcast to all external clients
   * - false: Only consumed internally, not broadcast
   *
   * Used for internal events like DriveableEvent that should be
   * processed by the engine but not sent directly to clients.
   * @default true
   */
  readonly broadcastable?: boolean;
}

// Type Guards for SystemEvent
/**
 * Check if event is from a specific source
 */
export function isFromSource<S extends EventSource>(
  event: SystemEvent,
  source: S
): event is SystemEvent<string, unknown, S> {
  return event.source === source;
}

/**
 * Check if event has a specific intent
 */
export function hasIntent<I extends EventIntent>(
  event: SystemEvent,
  intent: I
): event is SystemEvent<string, unknown, EventSource, EventCategory, I> {
  return event.intent === intent;
}

/**
 * Check if event is a request
 */
export function isRequest(event: SystemEvent): boolean {
  return event.intent === "request";
}

/**
 * Check if event is a result
 */
export function isResult(event: SystemEvent): boolean {
  return event.intent === "result";
}

/**
 * Check if event is a notification
 */
export function isNotification(event: SystemEvent): boolean {
  return event.intent === "notification";
}
