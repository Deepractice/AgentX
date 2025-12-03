import type { RuntimeEvent } from "../RuntimeEvent";

/**
 * Event indicating an agent has been started and entered the environment.
 * This is emitted after run() or resume() completes.
 */
export interface AgentStartedEvent extends RuntimeEvent<"agent_started", AgentStartedEventData> {}

export interface AgentStartedEventData {
  /** The started agent ID */
  readonly agentId: string;

  /** The image ID from which the agent was created */
  readonly imageId: string;

  /** The container ID where agent is running */
  readonly containerId: string;
}
