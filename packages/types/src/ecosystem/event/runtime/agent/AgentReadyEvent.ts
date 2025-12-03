import type { RuntimeEvent } from "../RuntimeEvent";

/**
 * Event indicating an agent is ready to receive messages.
 * Converted from AgentReadyStateEvent (Domain Event).
 */
export interface AgentReadyEvent extends RuntimeEvent<"agent_ready", AgentReadyEventData> {}

export interface AgentReadyEventData {
  /** The ready agent ID */
  readonly agentId: string;
}
