/**
 * Container Events
 *
 * All events related to Container operations:
 * - Lifecycle: creation, destruction, agent registration
 * - Sandbox: workspace and MCP tool operations
 */

// Lifecycle Events
export type {
  ContainerLifecycleEvent,
  ContainerCreatedEvent,
  ContainerDestroyedEvent,
  AgentRegisteredEvent,
  AgentUnregisteredEvent,
} from "./lifecycle";
export { isContainerLifecycleEvent } from "./lifecycle";

// Sandbox Events
export * from "./sandbox";

// ============================================================================
// Combined Union
// ============================================================================

import type { ContainerLifecycleEvent } from "./lifecycle";
import type { SandboxEvent } from "./sandbox";

/**
 * ContainerEvent - All container events
 */
export type ContainerEvent = ContainerLifecycleEvent | SandboxEvent;

/**
 * Type guard: is this a container event?
 */
export function isContainerEvent(event: { source?: string }): event is ContainerEvent {
  return event.source === "container" || event.source === "sandbox";
}
