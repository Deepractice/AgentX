/**
 * Container Lifecycle Events
 *
 * Events for container creation, destruction, and agent management.
 *
 * All ContainerLifecycleEvents have:
 * - source: "container"
 * - category: "lifecycle"
 * - intent: "notification"
 */

import type { SystemEvent } from "../../base";

// ============================================================================
// Base Type
// ============================================================================

/**
 * Base ContainerLifecycleEvent
 */
interface BaseContainerLifecycleEvent<T extends string, D = unknown> extends SystemEvent<
  T,
  D,
  "container",
  "lifecycle",
  "notification"
> {}

// ============================================================================
// Container Lifecycle Events
// ============================================================================

/**
 * ContainerCreatedEvent - Container was created
 */
export interface ContainerCreatedEvent extends BaseContainerLifecycleEvent<
  "container_created",
  {
    containerId: string;
    name?: string;
    createdAt: number;
  }
> {}

/**
 * ContainerDestroyedEvent - Container was destroyed
 */
export interface ContainerDestroyedEvent extends BaseContainerLifecycleEvent<
  "container_destroyed",
  {
    containerId: string;
    reason?: string;
    agentCount: number;
  }
> {}

// ============================================================================
// Agent Registration Events
// ============================================================================

/**
 * AgentRegisteredEvent - Agent was registered to container
 */
export interface AgentRegisteredEvent extends BaseContainerLifecycleEvent<
  "agent_registered",
  {
    containerId: string;
    agentId: string;
    definitionName: string;
    registeredAt: number;
  }
> {}

/**
 * AgentUnregisteredEvent - Agent was unregistered from container
 */
export interface AgentUnregisteredEvent extends BaseContainerLifecycleEvent<
  "agent_unregistered",
  {
    containerId: string;
    agentId: string;
    reason?: string;
  }
> {}

// ============================================================================
// Union Type
// ============================================================================

/**
 * ContainerLifecycleEvent - All container lifecycle events
 */
export type ContainerLifecycleEvent =
  | ContainerCreatedEvent
  | ContainerDestroyedEvent
  | AgentRegisteredEvent
  | AgentUnregisteredEvent;

/**
 * Type guard: is this a ContainerLifecycleEvent?
 */
export function isContainerLifecycleEvent(event: SystemEvent): event is ContainerLifecycleEvent {
  return event.source === "container" && event.category === "lifecycle";
}
