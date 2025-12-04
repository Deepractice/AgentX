/**
 * RuntimeEvent - Base interface for Container internal events
 *
 * RuntimeEvents are events that flow within a Container:
 * - AgentEvent: Agent internal events (stream, state, message, turn, error)
 * - SessionEvent: Session operations (lifecycle, persist, action)
 * - ContainerEvent: Container operations (lifecycle)
 * - SandboxEvent: Sandbox resource operations (llm, workspace, mcp)
 *
 * Isomorphic Design:
 * - Same event in different Ecosystems has different handling
 * - In NodeEcosystem: Events are executed locally
 * - In RemoteEcosystem: Request events are forwarded via network
 *
 * Example:
 * ```
 * SessionSaveRequest event:
 * - In Browser: NetworkEffector forwards to server
 * - In Server: RepositoryEffector executes SQLite save
 * ```
 */

import type { SystemEvent, EventSource, EventIntent, EventCategory } from "../base";

/**
 * RuntimeContext - Context information attached to RuntimeEvents
 *
 * Events on SystemBus carry context to identify their scope.
 */
export interface RuntimeContext {
  /**
   * Container ID (isolation boundary)
   */
  containerId?: string;

  /**
   * Agent ID (if event is agent-scoped)
   */
  agentId?: string;

  /**
   * Session ID (if event is session-scoped)
   */
  sessionId?: string;

  /**
   * Sandbox ID (if event is sandbox-scoped)
   */
  sandboxId?: string;

  /**
   * Correlation ID (for request-response tracking)
   */
  correlationId?: string;
}

/**
 * RuntimeEvent - Base interface for all Container internal events
 *
 * Extends SystemEvent with:
 * - source: Where the event originated
 * - category: Fine-grained classification
 * - intent: What the event represents (request/result/notification)
 * - context: Scope information (containerId, agentId, etc.)
 */
export interface RuntimeEvent<T extends string = string, D = unknown> extends SystemEvent<T, D> {
  /**
   * Event source domain
   */
  readonly source: EventSource;

  /**
   * Event category within source
   */
  readonly category: EventCategory;

  /**
   * Event intent
   */
  readonly intent: EventIntent;

  /**
   * Runtime context (scope information)
   */
  readonly context?: RuntimeContext;
}

/**
 * Type guard: is this a RuntimeEvent?
 */
export function isRuntimeEvent(event: SystemEvent): event is RuntimeEvent {
  return "source" in event && "category" in event && "intent" in event;
}

/**
 * Type guard: is this a request event?
 */
export function isRequestEvent(event: RuntimeEvent): boolean {
  return event.intent === "request";
}

/**
 * Type guard: is this a result event?
 */
export function isResultEvent(event: RuntimeEvent): boolean {
  return event.intent === "result";
}

/**
 * Type guard: is this a notification event?
 */
export function isNotificationEvent(event: RuntimeEvent): boolean {
  return event.intent === "notification";
}
