/**
 * Container Events - Container lifecycle events
 *
 * Events for container operations in the event system.
 */

import type { SystemEvent } from "./base";

// ============================================================================
// Container Lifecycle Events
// ============================================================================

/**
 * Base ContainerLifecycleEvent
 */
interface BaseContainerLifecycleEvent<T extends string, D = unknown>
  extends SystemEvent<T, D, "container", "lifecycle", "notification"> {}

/**
 * ContainerCreatedEvent - Container was created
 */
export interface ContainerCreatedEvent
  extends BaseContainerLifecycleEvent<
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
export interface ContainerDestroyedEvent
  extends BaseContainerLifecycleEvent<
    "container_destroyed",
    {
      containerId: string;
      reason?: string;
      agentCount: number;
    }
  > {}

/**
 * AgentRegisteredEvent - Agent was registered to container
 */
export interface AgentRegisteredEvent
  extends BaseContainerLifecycleEvent<
    "agent_registered",
    {
      containerId: string;
      instanceId: string;
      definitionName: string;
      registeredAt: number;
    }
  > {}

/**
 * AgentUnregisteredEvent - Agent was unregistered from container
 */
export interface AgentUnregisteredEvent
  extends BaseContainerLifecycleEvent<
    "agent_unregistered",
    {
      containerId: string;
      instanceId: string;
      reason?: string;
    }
  > {}

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
export function isContainerLifecycleEvent(event: {
  source?: string;
  category?: string;
}): event is ContainerLifecycleEvent {
  return event.source === "container" && event.category === "lifecycle";
}

// ============================================================================
// Container Event Union
// ============================================================================

/**
 * ContainerEvent - All container events
 */
export type ContainerEvent = ContainerLifecycleEvent;

/**
 * Type guard: is this a container event?
 */
export function isContainerEvent(event: { source?: string }): event is ContainerEvent {
  return event.source === "container";
}
