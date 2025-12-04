/**
 * Event System - Unified event definitions for AgentX
 *
 * Event Hierarchy:
 * ```
 * SystemEvent (base)
 * │
 * ├── EnvironmentEvent (external world perception)
 * │   ├── DriveableEvent (can drive Agent)
 * │   │   └── message_start, text_delta, tool_call...
 * │   └── ConnectionEvent (network status)
 * │       └── connected, disconnected, reconnecting
 * │
 * └── RuntimeEvent (Container internal)
 *     ├── AgentEvent
 *     │   ├── stream (real-time output)
 *     │   ├── state (transitions)
 *     │   ├── message (complete messages)
 *     │   ├── turn (conversation turns)
 *     │   └── error (agent errors)
 *     │
 *     ├── SessionEvent
 *     │   ├── lifecycle (created, destroyed)
 *     │   ├── persist (save, message persistence)
 *     │   └── action (resume, fork, title update)
 *     │
 *     ├── ContainerEvent
 *     │   └── lifecycle (created, destroyed, agent registration)
 *     │
 *     └── SandboxEvent
 *         ├── workspace (file operations)
 *         └── mcp (tool operations)
 * ```
 *
 * Design Principles:
 * - Type-as-Documentation: Types are self-explanatory
 * - Isomorphic: Same events work in Node and Browser
 * - Request/Result: Request events can be forwarded or executed
 */

// ============================================================================
// Base Types
// ============================================================================

export type {
  SystemEvent,
  EventSource,
  EventIntent,
  EventCategory,
} from "./base";

// ============================================================================
// Environment Events (External World)
// ============================================================================

export * from "./environment";

// ============================================================================
// Runtime Events (Container Internal)
// ============================================================================

export * from "./runtime";
