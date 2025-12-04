/**
 * SystemEvent - Base interface for all events in the system
 *
 * Event Hierarchy:
 * ```
 * SystemEvent (base)
 * │
 * ├── EnvironmentEvent (external world perception)
 * │   ├── DriveableEvent (can drive Agent)
 * │   └── ConnectionEvent (network status)
 * │
 * └── RuntimeEvent (Container internal)
 *     ├── AgentEvent (stream, state, message, turn, error)
 *     ├── SessionEvent (lifecycle, persist, action)
 *     ├── ContainerEvent (lifecycle)
 *     └── SandboxEvent (llm, workspace, mcp)
 * ```
 *
 * Design Principles:
 * - Type-as-Documentation: Types should be self-explanatory
 * - Structural Typing: Events are classified by structure
 * - Extensibility: Easy to add new event types
 */

/**
 * SystemEvent - Base interface for all events
 *
 * All events in the system extend from this interface.
 */
export interface SystemEvent<T extends string = string, D = unknown> {
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
}

/**
 * Event source - where the event originated
 */
export type EventSource =
  | "environment" // External world (Claude API, Network)
  | "agent" // Agent internal
  | "session" // Session operations
  | "container" // Container operations
  | "sandbox"; // Sandbox resources (LLM, Workspace, MCP)

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
  // Agent categories
  | "stream" // Streaming output
  | "state" // State transitions
  | "message" // Complete messages
  | "turn" // Conversation turns
  | "error" // Errors
  // Session categories
  | "lifecycle" // Creation/destruction
  | "persist" // Persistence operations
  | "action" // User actions (resume, fork)
  // Sandbox categories
  | "llm" // LLM operations
  | "workspace" // File operations
  | "mcp"; // MCP tool operations
