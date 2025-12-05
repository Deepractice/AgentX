/**
 * MirrorContainer - Browser-side Container proxy
 *
 * Proxies Container operations to server via WebSocket events.
 * All operations are event-driven - no direct HTTP calls.
 *
 * Architecture:
 * ```
 * Browser                          Server
 *   │                               │
 *   │  run_agent event              │
 *   │  ─────────────────────────►   │  Container.run()
 *   │                               │
 *   │  ◄═══════════════════════════ │  Agent events
 *   │     text_delta, tool_call...  │
 * ```
 *
 * Note: This is a simplified proxy that returns MirrorAgent instead of full Agent.
 */

import type {
  AgentDefinition,
  Peer,
  EnvironmentEvent,
} from "@agentxjs/types";
import { createLogger } from "@agentxjs/common";
import { MirrorAgent } from "./MirrorAgent";

const logger = createLogger("mirror/MirrorContainer");

/**
 * MirrorContainer - Browser Container proxy
 *
 * Implements a subset of Container interface for browser usage.
 */
export class MirrorContainer {
  readonly containerId: string;

  private readonly peer: Peer;
  private readonly agents = new Map<string, MirrorAgent>();
  private readonly pendingRuns = new Map<string, {
    resolve: (agent: MirrorAgent) => void;
    reject: (error: Error) => void;
  }>();

  constructor(containerId: string, peer: Peer) {
    this.containerId = containerId;
    this.peer = peer;

    // Listen for agent events from server
    this.peer.onUpstreamEvent((event) => {
      this.handleServerEvent(event);
    });

    logger.debug("MirrorContainer created", { containerId });
  }

  /**
   * Run an Agent from a definition
   *
   * Sends run_agent event to server and waits for agent_created response.
   */
  async run(definition: AgentDefinition): Promise<Agent> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    logger.debug("Running agent", { containerId: this.containerId, definitionName: definition.name });

    // Create promise for response
    const promise = new Promise<Agent>((resolve, reject) => {
      this.pendingRuns.set(requestId, { resolve, reject });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRuns.has(requestId)) {
          this.pendingRuns.delete(requestId);
          reject(new Error("Agent creation timeout"));
        }
      }, 30000);
    });

    // Send run_agent event to server
    this.peer.sendUpstream({
      type: "run_agent",
      data: {
        requestId,
        containerId: this.containerId,
        definition,
      },
    } as EnvironmentEvent);

    return promise;
  }

  /**
   * Get an Agent by ID
   */
  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Check if an Agent exists
   */
  hasAgent(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  /**
   * List all Agents
   */
  listAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * List all Agent IDs
   */
  listAgentIds(): string[] {
    return Array.from(this.agents.keys());
  }

  /**
   * Get Agent count
   */
  agentCount(): number {
    return this.agents.size;
  }

  /**
   * Destroy an Agent by ID
   */
  async destroyAgent(agentId: string): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    // Send destroy_agent event to server
    this.peer.sendUpstream({
      type: "destroy_agent",
      data: {
        containerId: this.containerId,
        agentId,
      },
    } as EnvironmentEvent);

    // Remove from local cache
    agent.dispose();
    this.agents.delete(agentId);

    logger.debug("Agent destroyed", { containerId: this.containerId, agentId });
    return true;
  }

  /**
   * Destroy all Agents
   */
  async destroyAllAgents(): Promise<void> {
    for (const agentId of this.agents.keys()) {
      await this.destroyAgent(agentId);
    }
  }

  /**
   * Dispose container
   */
  async dispose(): Promise<void> {
    await this.destroyAllAgents();
    logger.debug("MirrorContainer disposed", { containerId: this.containerId });
  }

  /**
   * Handle events from server
   */
  private handleServerEvent(event: EnvironmentEvent): void {
    switch (event.type) {
      case "agent_created":
        this.handleAgentCreated(event);
        break;

      case "text_delta":
      case "tool_call":
      case "tool_result":
      case "message_start":
      case "message_stop":
        this.forwardToAgent(event);
        break;

      default:
        // Forward other events to appropriate agent
        this.forwardToAgent(event);
    }
  }

  /**
   * Handle agent_created event
   */
  private handleAgentCreated(event: EnvironmentEvent): void {
    const { requestId, agentId, containerId } = event.data as {
      requestId: string;
      agentId: string;
      containerId: string;
    };

    // Ignore if not for this container
    if (containerId !== this.containerId) {
      return;
    }

    const pending = this.pendingRuns.get(requestId);
    if (!pending) {
      logger.warn("No pending run for agent_created", { requestId, agentId });
      return;
    }

    // Create MirrorAgent
    const agent = new MirrorAgent(agentId, this.peer);
    this.agents.set(agentId, agent);

    // Resolve promise
    this.pendingRuns.delete(requestId);
    pending.resolve(agent);

    logger.debug("Agent created", { containerId: this.containerId, agentId });
  }

  /**
   * Forward event to the appropriate agent
   */
  private forwardToAgent(event: EnvironmentEvent): void {
    const agentId = (event.data as { agentId?: string })?.agentId;
    if (!agentId) {
      return;
    }

    const agent = this.agents.get(agentId);
    if (agent) {
      agent.handleEvent(event);
    }
  }
}
