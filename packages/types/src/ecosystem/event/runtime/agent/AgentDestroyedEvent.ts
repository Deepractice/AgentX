import type { RuntimeEvent } from "../RuntimeEvent";

/**
 * Event indicating an agent has been destroyed and left the environment.
 * Converted from AgentDestroyedStateEvent (Domain Event).
 */
export interface AgentDestroyedEvent
  extends RuntimeEvent<"agent_destroyed", AgentDestroyedEventData> {}

export interface AgentDestroyedEventData {
  /** The destroyed agent ID */
  readonly agentId: string;

  /** Reason for destruction (optional) */
  readonly reason?: string;
}
