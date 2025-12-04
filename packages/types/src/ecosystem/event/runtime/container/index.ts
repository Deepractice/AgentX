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
  AllContainerLifecycleEvent,
  ContainerCreatedEvent,
  ContainerDestroyedEvent,
  AgentRegisteredEvent,
  AgentUnregisteredEvent,
} from "./lifecycle";

// Sandbox Events
export * from "./sandbox";

// ============================================================================
// Combined Union
// ============================================================================

import type { AllContainerLifecycleEvent } from "./lifecycle";
import type { SandboxEvent } from "./sandbox";

/**
 * ContainerEvent - All container events
 */
export type ContainerEvent = AllContainerLifecycleEvent | SandboxEvent;

/**
 * Type guard: is this a container event?
 */
export function isContainerEvent(event: { source?: string }): event is ContainerEvent {
  return event.source === "container" || event.source === "sandbox";
}
