/**
 * Container Events
 *
 * All events related to Container operations:
 * - Lifecycle: creation, destruction, agent registration
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

// ============================================================================
// Combined Union
// ============================================================================

import type { AllContainerLifecycleEvent } from "./lifecycle";

/**
 * ContainerEvent - All container events
 */
export type ContainerEvent = AllContainerLifecycleEvent;

/**
 * Type guard: is this a container event?
 */
export function isContainerEvent(event: { source?: string }): event is ContainerEvent {
  return event.source === "container";
}
