/**
 * Ecosystem Events - Unified event definitions
 *
 * Event Hierarchy:
 * ```
 * EnvironmentEvent (all external perceptions)
 * │
 * ├── DriveableEvent (can drive Agent)
 * │   │   - AgentDriver.receive() → DriveableEvent
 * │   │   - AgentEngine.process(DriveableEvent)
 * │   └── MessageStartEvent, TextDeltaEvent, ToolCallEvent...
 * │
 * └── ConnectionEvent (network status only)
 *     └── ConnectedEvent, DisconnectedEvent
 * ```
 *
 * All events that flow on SystemBus:
 * - EnvironmentEvent - External world events
 * - AgentEvent - Agent events (state, stream, message, turn, error)
 * - SessionEvent - Session events (TODO)
 * - ContainerEvent - Container events (TODO)
 */

// Environment Events (external world)
export * from "./EnvironmentEvent";

// Agent Events
export * from "./agent";
