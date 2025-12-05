/**
 * AgentX - Unified API Layer
 *
 * Central entry point for all agent operations.
 *
 * ## API Structure
 *
 * ```text
 * agentx
 * ├── .definitions.*   DefinitionAPI
 * ├── .images.*        ImageAPI
 * ├── .containers.*    ContainerAPI
 * ├── .sessions.*      SessionAPI (includes run)
 * ├── .agents.*        AgentAPI
 * ├── .events.*        EventsAPI
 * └── .dispose()       Cleanup
 * ```
 *
 * Hierarchy: Container → Session → Agent
 *
 * @packageDocumentation
 */

// Main platform interface
export type { AgentX } from "./AgentX";

// Factory functions
export { createAgentX, createMirror } from "./createAgentX";
export type { MirrorOptions } from "./createAgentX";

// defineAgent
export type { DefineAgentInput } from "./defineAgent";
export { defineAgent } from "./defineAgent";

// Application API (static resources)
export * from "./application";

// Runtime API (dynamic instances + events)
export * from "./runtime";
