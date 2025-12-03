/**
 * EnvironmentEvent - External information that the system cares about
 *
 * This is NOT a filter of external events, but an "eventification" of external information.
 * External world may not be event-based, but we convert what we care about into events.
 *
 * Analogy: Reading a newspaper, you only read news you care about.
 *
 * Design principles:
 * - Only define what the system NEEDS, not what external sources HAVE
 * - Keep it minimal (8-10 event types vs SDK's 20+)
 * - Abstract away implementation details (no content_block_start/stop)
 *
 * Event flow:
 * ```
 * External World  →  Environment  →  EnvironmentEvent  →  Receptor  →  RuntimeEvent
 * (any form)         (感知+转换)     (我们关心的)          (富化)       (系统使用)
 * ```
 *
 * @see issues/028-reactor-pattern-systembus-architecture.md
 */

// ============================================================================
// Stream Events - LLM output streaming
// ============================================================================

/**
 * Text chunk from LLM response
 */
export interface TextChunkEvent {
  readonly type: "text_chunk";
  readonly text: string;
}

/**
 * Tool call completed (full input, not streaming JSON delta)
 */
export interface ToolCallEvent {
  readonly type: "tool_call";
  readonly toolUseId: string;
  readonly name: string;
  readonly input: unknown;
}

/**
 * Tool execution result
 */
export interface ToolResultEvent {
  readonly type: "tool_result";
  readonly toolUseId: string;
  readonly result: unknown;
  readonly isError: boolean;
}

// ============================================================================
// Flow Control Events - Stream lifecycle
// ============================================================================

/**
 * Stream started
 */
export interface StreamStartEvent {
  readonly type: "stream_start";
  readonly messageId: string;
  readonly model?: string;
}

/**
 * Stream ended normally
 */
export interface StreamEndEvent {
  readonly type: "stream_end";
  readonly stopReason: string;
}

/**
 * Stream interrupted by user
 */
export interface InterruptedEvent {
  readonly type: "interrupted";
  readonly reason: string;
}

// ============================================================================
// Connection Events - Remote environment only
// ============================================================================

/**
 * Connection established
 */
export interface ConnectedEvent {
  readonly type: "connected";
}

/**
 * Connection lost
 */
export interface DisconnectedEvent {
  readonly type: "disconnected";
  readonly reason?: string;
}

// ============================================================================
// Error Events
// ============================================================================

/**
 * Error occurred
 */
export interface ErrorEvent {
  readonly type: "error";
  readonly error: Error;
  readonly code?: string;
}

// ============================================================================
// Union Type
// ============================================================================

/**
 * Union of all EnvironmentEvent types
 */
export type EnvironmentEvent =
  // Stream
  | TextChunkEvent
  | ToolCallEvent
  | ToolResultEvent
  // Flow control
  | StreamStartEvent
  | StreamEndEvent
  | InterruptedEvent
  // Connection
  | ConnectedEvent
  | DisconnectedEvent
  // Error
  | ErrorEvent;

/**
 * Extract event type string union
 */
export type EnvironmentEventType = EnvironmentEvent["type"];
