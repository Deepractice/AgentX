/**
 * ContainerImpl - Container implementation for managing Agent instances
 *
 * Container is a runtime isolation boundary where Agents live and work.
 * Each Container manages multiple Agents, each with its own Sandbox.
 *
 * Internal components (not exposed):
 * - SystemBus: Event communication (package singleton)
 * - AgentEngine: Mealy Machine processor (stateless, created per agent)
 * - BusDriver: Driver that communicates via bus
 * - Sandbox: Isolated per Agent
 */

import type {
  Container,
  Agent,
  AgentDefinition,
  Sandbox,
  Workspace,
  SystemBus,
} from "@agentxjs/types";
import { AgentEngine } from "@agentxjs/engine";
import { AgentInstance, createAgentContext } from "@agentxjs/agent";
import { createLogger } from "@agentxjs/common";
import { BusDriver } from "../driver";
import { homedir } from "node:os";
import { join } from "node:path";

const logger = createLogger("runtime/ContainerImpl");

/**
 * ContainerImpl configuration
 */
export interface ContainerImplConfig {
  /**
   * Container ID
   */
  containerId: string;

  /**
   * SystemBus for event communication
   */
  bus: SystemBus;

  /**
   * Base path for workspaces (default: ~/.agentx)
   */
  basePath?: string;
}

/**
 * ContainerImpl - Container implementation
 */
export class ContainerImpl implements Container {
  readonly containerId: string;

  private readonly agents = new Map<string, Agent>();
  private readonly bus: SystemBus;
  private readonly basePath: string;

  constructor(config: ContainerImplConfig) {
    this.containerId = config.containerId;
    this.bus = config.bus;
    this.basePath = config.basePath ?? join(homedir(), ".agentx");

    logger.info("Container created", { containerId: this.containerId });
  }

  // ==================== Agent Lifecycle ====================

  /**
   * Run an Agent from a definition
   */
  async run(definition: AgentDefinition): Promise<Agent> {
    // 1. Generate agent context (includes agentId)
    const context = createAgentContext();
    const agentId = context.agentId;

    logger.info("Creating agent", {
      containerId: this.containerId,
      agentId,
      definitionName: definition.name,
    });

    // 2. Create Sandbox (isolated per Agent)
    const sandbox = this.createSandbox(agentId);

    // 3. Create Engine (stateless, can create per agent)
    const engine = new AgentEngine();

    // 4. Create Driver (communicates via bus)
    const driver = new BusDriver(this.bus, { agentId });

    // 5. Create AgentInstance
    const agent = new AgentInstance(
      definition,
      context,
      engine,
      driver,
      sandbox,
      this.bus
    );

    // 6. Register in container
    this.agents.set(agentId, agent);

    logger.info("Agent created", {
      containerId: this.containerId,
      agentId,
      definitionName: definition.name,
    });

    return agent;
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

    await agent.destroy();
    this.agents.delete(agentId);

    logger.info("Agent destroyed", {
      containerId: this.containerId,
      agentId,
    });

    return true;
  }

  /**
   * Destroy all Agents
   */
  async destroyAllAgents(): Promise<void> {
    const agentIds = Array.from(this.agents.keys());
    for (const agentId of agentIds) {
      await this.destroyAgent(agentId);
    }
  }

  // ==================== Container Lifecycle ====================

  /**
   * Dispose container and all Agents
   */
  async dispose(): Promise<void> {
    await this.destroyAllAgents();
    logger.info("Container disposed", { containerId: this.containerId });
  }

  // ==================== Private Helpers ====================

  /**
   * Create Sandbox for an Agent
   */
  private createSandbox(agentId: string): Sandbox {
    const workspace: Workspace = {
      id: agentId,
      name: `workspace_${agentId}`,
      path: join(this.basePath, "containers", this.containerId, "workspaces", agentId),
    };

    return {
      name: `sandbox_${agentId}`,
      workspace,
    };
  }
}
