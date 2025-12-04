/**
 * Container Lifecycle Events
 *
 * Events for container creation, destruction, and agent management.
 */

import type { RuntimeEvent } from "../../RuntimeEvent";

/**
 * Base ContainerLifecycleEvent
 */
export interface ContainerLifecycleEvent<T extends string = string, D = unknown>
  extends RuntimeEvent<T, D> {
  source: "container";
  category: "lifecycle";
}

// ============================================================================
// Container Lifecycle Events
// ============================================================================

/**
 * ContainerCreatedEvent - Container was created
 */
export interface ContainerCreatedEvent extends ContainerLifecycleEvent<"container_created"> {
  intent: "notification";
  data: {
    containerId: string;
    name?: string;
    createdAt: number;
  };
}

/**
 * ContainerDestroyedEvent - Container was destroyed
 */
export interface ContainerDestroyedEvent extends ContainerLifecycleEvent<"container_destroyed"> {
  intent: "notification";
  data: {
    containerId: string;
    reason?: string;
    agentCount: number;
  };
}

// ============================================================================
// Agent Registration Events
// ============================================================================

/**
 * AgentRegisteredEvent - Agent was registered to container
 */
export interface AgentRegisteredEvent extends ContainerLifecycleEvent<"agent_registered"> {
  intent: "notification";
  data: {
    containerId: string;
    agentId: string;
    definitionName: string;
    registeredAt: number;
  };
}

/**
 * AgentUnregisteredEvent - Agent was unregistered from container
 */
export interface AgentUnregisteredEvent extends ContainerLifecycleEvent<"agent_unregistered"> {
  intent: "notification";
  data: {
    containerId: string;
    agentId: string;
    reason?: string;
  };
}

// ============================================================================
// Union Type
// ============================================================================

/**
 * AllContainerLifecycleEvent - All container lifecycle events
 */
export type AllContainerLifecycleEvent =
  | ContainerCreatedEvent
  | ContainerDestroyedEvent
  | AgentRegisteredEvent
  | AgentUnregisteredEvent;
