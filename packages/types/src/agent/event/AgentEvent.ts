/**
 * AgentEvent - Base interface for all Agent events
 *
 * Event Hierarchy in Agent package:
 * ```
 * AgentEvent (base)
 * │
 * ├── DriveableEvent (from Driver)
 * │   └── MessageStartEvent, TextDeltaEvent, ToolCallEvent...
 * │
 * └── ProcessedEvent (from Engine)
 *     ├── StateEvent (state transitions)
 *     ├── MessageEvent (assembled messages)
 *     └── TurnEvent (turn analytics)
 * ```
 */

/**
 * AgentEvent - Base interface for all Agent events
 */
export interface AgentEvent<T extends string = string, D = unknown> {
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
}
