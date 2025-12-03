/**
 * Ecosystem Module - Runtime environment for AI Agents
 *
 * ## ADR: Three-Layer Architecture (Ontological Foundation)
 *
 * Based on three fundamental ontological categories from issue #026:
 *
 * | Layer       | Ontology  | Protocol    | Content                          |
 * |-------------|-----------|-------------|----------------------------------|
 * | Application | Structure | HTTP        | Definition, Image, User          |
 * | Network     | Relation  | HTTP + WS   | Server, Client, Channel          |
 * | Ecosystem   | Process   | WS Events   | Runtime, Container, Session, Agent |
 *
 * This module defines the **Ecosystem Layer** - dynamic processes and activities.
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    Ecosystem Layer                          │
 * ├─────────────────────────────────────────────────────────────┤
 * │  Pure Abstractions (Systems Theory)                         │
 * │  - Ecosystem: Event bus interface                           │
 * │  - Receptor: Input boundary (senses external signals)       │
 * │  - Effector: Output boundary (transmits events)             │
 * ├─────────────────────────────────────────────────────────────┤
 * │  Runtime Layer                                              │
 * │  - Runtime: Infrastructure interface                        │
 * │  - Container: Agent isolation boundary                      │
 * │  - Session: User conversation context                       │
 * │  - Repository: Storage abstraction                          │
 * ├─────────────────────────────────────────────────────────────┤
 * │  Agent Layer                                                │
 * │  - Agent: AI agent runtime instance                         │
 * │  - Message: Conversation messages                           │
 * │  - Events: Stream, State, Message, Turn (4-layer system)    │
 * └─────────────────────────────────────────────────────────────┘
 * ```
 *
 * ## ADR: Event-Driven Architecture
 *
 * All runtime communication uses events (WebSocket), not HTTP:
 * - Agent lifecycle events (started, ready, destroyed)
 * - Conversation events (start, thinking, responding, end)
 * - Stream events (text_delta, tool_call, tool_result)
 *
 * This enables real-time bidirectional communication and
 * clean separation from static resource management (HTTP).
 *
 * @see issues/026-three-layer-architecture.md
 * @packageDocumentation
 */

// ============================================================================
// Pure Abstractions (Systems Theory)
// ============================================================================

export type { Ecosystem, EcosystemEventHandler } from "./Ecosystem";
export type { EcosystemEvent } from "./event/EcosystemEvent";
export type { Receptor } from "./Receptor";
export type { Effector } from "./Effector";
export type { SystemBus, BusEvent, BusEventHandler } from "./SystemBus";

// ============================================================================
// Runtime Layer
// ============================================================================

// Runtime interface
export type { Runtime, AgentIdResolver } from "./runtime/Runtime";

// RuntimeDriver - Driver + Sandbox combination
export type { RuntimeDriver } from "~/ecosystem/runtime/container/driver/RuntimeDriver";

// Container and Sandbox
export * from "./runtime/container";
export * from "~/ecosystem/runtime/container/sandbox";

// Session
export * from "./runtime/session";

// Repository
export * from "./runtime/repository";

// Receptors
export * from "./receptors";

// Runtime Events
export * from "./event";

// ============================================================================
// Agent Layer
// ============================================================================

export * from "./runtime/agent";
export * from "~/ecosystem/runtime/agent/message";
export * from "~/ecosystem/runtime/agent/event";
