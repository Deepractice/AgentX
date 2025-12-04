/**
 * Ecosystem Events - Unified event definitions
 *
 * All events that flow on SystemBus:
 * - EnvironmentEvent - External world events (connected, disconnected, text_chunk, etc.)
 * - AgentEvent - Agent events (state, stream, message, turn, error)
 * - SessionEvent - Session events (TODO)
 * - ContainerEvent - Container events (TODO)
 *
 * @see issues/030-ecosystem-architecture.md
 */

// Environment Events (external world)
export * from "./EnvironmentEvent";

// Agent Events
export * from "./agent";
