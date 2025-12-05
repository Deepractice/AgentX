/**
 * RuntimeImpl - Runtime implementation
 */

import type { Persistence, ContainerRecord } from "@agentxjs/types";
import type {
  Runtime,
  ContainersAPI,
  AgentsAPI,
  EventsAPI,
  ContainerInfo,
  Unsubscribe,
  RuntimeEventHandler,
  ClaudeLLMConfig,
  LLMProvider,
} from "@agentxjs/types/runtime";
import type { Agent, AgentConfig } from "@agentxjs/types/runtime";
import type { Environment } from "@agentxjs/types/runtime/internal";
import type { RuntimeConfig } from "./createRuntime";
import { SystemBusImpl, RuntimeAgent, RuntimeSession, RuntimeSandbox } from "./internal";
import { ClaudeEnvironment } from "./environment";
import { createLogger } from "@agentxjs/common";
import { homedir } from "node:os";
import { join } from "node:path";

const logger = createLogger("runtime/RuntimeImpl");

/**
 * RuntimeImpl - Implementation of Runtime interface
 */
export class RuntimeImpl implements Runtime {
  readonly containers: ContainersAPI;
  readonly agents: AgentsAPI;
  readonly events: EventsAPI;

  private readonly persistence: Persistence;
  private readonly llmProvider: LLMProvider<ClaudeLLMConfig>;
  private readonly bus: SystemBusImpl;
  private readonly environment: Environment;
  private readonly basePath: string;

  /** In-memory agent registry: agentId -> Agent */
  private readonly agentRegistry = new Map<string, Agent>();

  /** In-memory container -> agents mapping */
  private readonly containerAgents = new Map<string, Set<string>>();

  /** Event handlers */
  private readonly eventHandlers = new Map<string, Set<RuntimeEventHandler>>();
  private readonly allEventHandlers = new Set<RuntimeEventHandler>();

  constructor(config: RuntimeConfig) {
    logger.info("RuntimeImpl constructor start");
    this.persistence = config.persistence;
    this.llmProvider = config.llmProvider;
    this.basePath = join(homedir(), ".agentx");

    // Create SystemBus
    logger.info("Creating SystemBus");
    this.bus = new SystemBusImpl();

    // Subscribe bus events to runtime events
    this.bus.onAny((event) => {
      this.emit(event as { type: string });
    });

    // Use custom environment or create ClaudeEnvironment from LLMProvider
    if (config.environment) {
      logger.info("Using custom Environment");
      this.environment = config.environment;
    } else {
      logger.info("Creating ClaudeEnvironment");
      const llmConfig = this.llmProvider.provide();
      this.environment = new ClaudeEnvironment({
        apiKey: llmConfig.apiKey,
        baseUrl: llmConfig.baseUrl,
        model: llmConfig.model,
      });
    }
    logger.info("Connecting Environment to bus");
    this.environment.receptor.emit(this.bus);
    this.environment.effector.subscribe(this.bus);

    // Initialize APIs
    logger.info("Creating APIs");
    this.containers = this.createContainersAPI();
    this.agents = this.createAgentsAPI();
    this.events = this.createEventsAPI();
    logger.info("RuntimeImpl constructor done");
  }

  // ==================== Containers API ====================

  private createContainersAPI(): ContainersAPI {
    return {
      create: async (containerId: string): Promise<ContainerInfo> => {
        // Check if exists
        const existing = await this.persistence.containers.findContainerById(containerId);
        if (existing) {
          return this.toContainerInfo(existing);
        }

        // Create new
        const now = Date.now();
        const record: ContainerRecord = {
          containerId,
          createdAt: now,
          updatedAt: now,
        };
        await this.persistence.containers.saveContainer(record);

        // Initialize container agents set
        this.containerAgents.set(containerId, new Set());

        return this.toContainerInfo(record);
      },

      get: async (containerId: string): Promise<ContainerInfo | undefined> => {
        const record = await this.persistence.containers.findContainerById(containerId);
        if (!record) return undefined;
        return this.toContainerInfo(record);
      },

      list: async (): Promise<ContainerInfo[]> => {
        const records = await this.persistence.containers.findAllContainers();
        return records.map((r) => this.toContainerInfo(r));
      },

      dispose: async (containerId: string): Promise<void> => {
        // Destroy all agents in container
        await this.agents.destroyAll(containerId);

        // Remove from memory
        this.containerAgents.delete(containerId);

        // Note: Container record stays in persistence (dispose != delete)
      },
    };
  }

  private toContainerInfo(record: ContainerRecord): ContainerInfo {
    const agentIds = this.containerAgents.get(record.containerId);
    return {
      containerId: record.containerId,
      createdAt: record.createdAt,
      agentCount: agentIds?.size ?? 0,
    };
  }

  // ==================== Agents API ====================

  private createAgentsAPI(): AgentsAPI {
    return {
      run: async (containerId: string, config: AgentConfig): Promise<Agent> => {
        // Verify container exists
        const container = await this.persistence.containers.findContainerById(containerId);
        if (!container) {
          throw new Error(`Container not found: ${containerId}`);
        }

        // Generate agent ID and session ID
        const agentId = this.generateId();
        const sessionId = this.generateId();

        // Create and initialize Sandbox
        const sandbox = new RuntimeSandbox({
          agentId,
          containerId,
          basePath: this.basePath,
        });
        await sandbox.initialize();

        // Create Session
        const session = new RuntimeSession({
          sessionId,
          agentId,
          containerId,
          repository: this.persistence.sessions,
        });
        await session.initialize();

        // Create RuntimeAgent
        const agent = new RuntimeAgent({
          agentId,
          containerId,
          config,
          bus: this.bus,
          sandbox,
          session,
        });

        // Register
        this.agentRegistry.set(agentId, agent);

        // Add to container
        let agentIds = this.containerAgents.get(containerId);
        if (!agentIds) {
          agentIds = new Set();
          this.containerAgents.set(containerId, agentIds);
        }
        agentIds.add(agentId);

        return agent;
      },

      get: (agentId: string): Agent | undefined => {
        return this.agentRegistry.get(agentId);
      },

      list: (containerId: string): Agent[] => {
        const agentIds = this.containerAgents.get(containerId);
        if (!agentIds) return [];

        const agents: Agent[] = [];
        for (const id of agentIds) {
          const agent = this.agentRegistry.get(id);
          if (agent) agents.push(agent);
        }
        return agents;
      },

      destroy: async (agentId: string): Promise<boolean> => {
        const agent = this.agentRegistry.get(agentId);
        if (!agent) return false;

        // Call agent's destroy
        await agent.destroy();

        // Remove from registry
        this.agentRegistry.delete(agentId);

        // Remove from container
        for (const agentIds of this.containerAgents.values()) {
          agentIds.delete(agentId);
        }

        return true;
      },

      destroyAll: async (containerId: string): Promise<void> => {
        const agentIds = this.containerAgents.get(containerId);
        if (!agentIds) return;

        for (const agentId of Array.from(agentIds)) {
          await this.agents.destroy(agentId);
        }
      },
    };
  }

  // ==================== Events API ====================

  private createEventsAPI(): EventsAPI {
    return {
      on: <T extends string>(type: T, handler: RuntimeEventHandler): Unsubscribe => {
        let handlers = this.eventHandlers.get(type);
        if (!handlers) {
          handlers = new Set();
          this.eventHandlers.set(type, handlers);
        }
        handlers.add(handler);

        return () => {
          handlers?.delete(handler);
        };
      },

      onAll: (handler: RuntimeEventHandler): Unsubscribe => {
        this.allEventHandlers.add(handler);
        return () => {
          this.allEventHandlers.delete(handler);
        };
      },
    };
  }

  /**
   * Emit event to handlers
   */
  private emit(event: { type: string; [key: string]: unknown }): void {
    // Type-specific handlers
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        handler(event);
      }
    }

    // All-event handlers
    for (const handler of this.allEventHandlers) {
      handler(event);
    }
  }

  // ==================== Lifecycle ====================

  async dispose(): Promise<void> {
    logger.info("Disposing RuntimeImpl");

    // Destroy all agents in all containers
    for (const containerId of this.containerAgents.keys()) {
      await this.agents.destroyAll(containerId);
    }

    // Dispose environment (if it has a dispose method)
    if ("dispose" in this.environment && typeof this.environment.dispose === "function") {
      (this.environment as { dispose: () => void }).dispose();
    }

    // Destroy bus
    this.bus.destroy();

    // Clear all state
    this.agentRegistry.clear();
    this.containerAgents.clear();
    this.eventHandlers.clear();
    this.allEventHandlers.clear();

    logger.info("RuntimeImpl disposed");
  }

  // ==================== Private Helpers ====================

  private generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}_${random}`;
  }
}
