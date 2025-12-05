// @ts-nocheck
/**
 * @deprecated Use NodeRuntime instead. This class will be removed in a future version.
 *
 * AgentRuntime - Legacy Runtime implementation for AI Agents
 *
 * Assembles all components for running AI Agents:
 *
 * **Infrastructure Layer:**
 * - SystemBus: Central event bus for all communication
 * - Environment: ClaudeEnvironment (Receptor + Effector)
 * - Repository: SQLite storage
 * - LLM Provider: Environment-based configuration
 * - Logger: File-based logging
 *
 * **Agent Layer:**
 * - AgentEngine: Mealy Machine event processor
 * - Container: Agent instance management
 * - createAgent(): Factory for creating agents
 *
 * @example
 * ```typescript
 * // DEPRECATED - use nodeRuntime() instead
 * import { nodeRuntime } from "@agentxjs/runtime";
 *
 * const runtime = nodeRuntime();
 * const container = runtime.createContainer("my-container");
 * const agent = container.run({ name: "Assistant", systemPrompt: "..." });
 * ```
 */

import type {
  SystemBus,
  Environment,
  Repository,
  LLMProvider,
  LoggerFactory,
  Agent,
  AgentDefinition,
  Container,
  Sandbox,
  Workspace,
} from "@agentxjs/types";
import { setLoggerFactory, createLogger } from "@agentxjs/common";
import { AgentEngine } from "@agentxjs/engine";
import { AgentInstance, MemoryContainer, createAgentContext } from "@agentxjs/agent";
import { SystemBusImpl } from "./SystemBusImpl";
import { ClaudeEnvironment, type ClaudeEnvironmentConfig } from "./environment";
import { SQLiteRepository, EnvLLMProvider, FileLoggerFactory } from "./runtime";
import { BusDriver } from "./driver";
import type { LLMSupply, FileLoggerFactoryOptions } from "./runtime";
import { homedir } from "node:os";
import { join } from "node:path";

const logger = createLogger("runtime/AgentRuntime");

/**
 * AgentRuntime configuration
 */
export interface AgentRuntimeConfig {
  /**
   * LLM provider or config
   * @default EnvLLMProvider - reads from environment variables
   */
  llm?: LLMProvider<LLMSupply> | Partial<LLMSupply>;

  /**
   * Repository instance or SQLite path
   * @default SQLiteRepository at ~/.agentx/data/agentx.db
   */
  repository?: Repository | { path?: string };

  /**
   * Logger factory or config
   * @default FileLoggerFactory at ~/.agentx/logs/
   */
  logger?: LoggerFactory | FileLoggerFactoryOptions;

  /**
   * Claude Environment config (optional)
   * If not provided, ClaudeEnvironment is not created
   */
  claude?: Omit<ClaudeEnvironmentConfig, "apiKey" | "model"> & {
    apiKey?: string;
    model?: string;
  };
}

/**
 * AgentRuntime - Complete runtime for AI Agents on Node.js platform
 */
export class AgentRuntime {
  // ============================================================================
  // Infrastructure Layer
  // ============================================================================

  /**
   * Central event bus for all communication
   */
  readonly bus: SystemBus;

  /**
   * Claude environment (Receptor + Effector)
   */
  readonly environment: Environment | null;

  /**
   * Data persistence
   */
  readonly repository: Repository;

  /**
   * LLM provider
   */
  readonly llm: LLMProvider<LLMSupply>;

  /**
   * Logger factory
   */
  readonly loggerFactory: LoggerFactory;

  // ============================================================================
  // Agent Runtime Layer
  // ============================================================================

  /**
   * Mealy Machine event processor
   * Transforms Stream events into State/Message/Turn events
   */
  readonly engine: AgentEngine;

  /**
   * Agent instance container
   * Manages agent lifecycle (register, get, unregister)
   */
  readonly container: Container;

  private readonly basePath: string;

  constructor(config: AgentRuntimeConfig = {}) {
    this.basePath = join(homedir(), ".agentx");

    // ========================================
    // Infrastructure Layer Initialization
    // ========================================

    // 1. Create logger factory first (for logging during init)
    this.loggerFactory = this.resolveLoggerFactory(config.logger);
    setLoggerFactory(this.loggerFactory);

    logger.info("Initializing AgentRuntime");

    // 2. Create SystemBus
    this.bus = new SystemBusImpl();

    // 3. Create LLM provider
    this.llm = this.resolveLLMProvider(config.llm);

    // 4. Create repository
    this.repository = this.resolveRepository(config.repository);

    // 5. Create Claude environment if configured
    if (config.claude !== undefined || config.llm !== undefined) {
      const llmSupply = this.llm.provide();
      const claudeConfig: ClaudeEnvironmentConfig = {
        apiKey: config.claude?.apiKey ?? llmSupply.apiKey,
        model: config.claude?.model ?? llmSupply.model,
        baseUrl: config.claude?.baseUrl ?? llmSupply.baseUrl,
        systemPrompt: config.claude?.systemPrompt,
        cwd: config.claude?.cwd,
        sessionId: config.claude?.sessionId,
        resumeSessionId: config.claude?.resumeSessionId,
        onSessionIdCaptured: config.claude?.onSessionIdCaptured,
      };

      const claudeEnv = new ClaudeEnvironment(claudeConfig);

      // Connect environment to SystemBus
      claudeEnv.receptor.emit(this.bus);
      claudeEnv.effector.subscribe(this.bus);

      this.environment = claudeEnv;
    } else {
      this.environment = null;
    }

    // ========================================
    // Agent Runtime Layer Initialization
    // ========================================

    // 6. Create AgentEngine (Mealy Machine processor)
    this.engine = new AgentEngine();

    // 7. Create Container (agent instance management)
    this.container = new MemoryContainer();

    logger.info("AgentRuntime initialized");
  }

  // ============================================================================
  // Agent API
  // ============================================================================

  /**
   * Create an Agent from a definition
   *
   * @param definition - Agent definition (name, systemPrompt, etc.)
   * @returns Running Agent instance
   *
   * @example
   * ```typescript
   * const agent = ecosystem.createAgent({
   *   name: "Assistant",
   *   systemPrompt: "You are a helpful assistant",
   * });
   *
   * agent.on("text_delta", (e) => console.log(e.data.text));
   * await agent.receive("Hello!");
   * ```
   */
  createAgent(definition: AgentDefinition): Agent {
    // Generate context (includes agentId)
    const context = createAgentContext();
    const agentId = context.agentId;

    logger.info("Creating agent", {
      agentId,
      definitionName: definition.name,
    });

    // Create sandbox (simple implementation for now)
    const sandbox = this.createSandbox(agentId);

    // Create BusDriver - communicates via SystemBus
    const driver = new BusDriver(this.bus, { agentId });

    // Create agent instance
    const agent = new AgentInstance(
      definition,
      context,
      this.engine,
      driver,
      sandbox,
      this.bus
    );

    // Register in container
    this.container.register(agent);

    logger.info("Agent created", {
      agentId,
      definitionName: definition.name,
    });

    return agent;
  }

  /**
   * Get an agent by ID
   */
  getAgent(agentId: string): Agent | undefined {
    return this.container.get(agentId);
  }

  /**
   * List all agents
   */
  listAgents(): Agent[] {
    return this.container.list();
  }

  /**
   * Destroy an agent
   */
  async destroyAgent(agentId: string): Promise<void> {
    const agent = this.container.get(agentId);
    if (agent) {
      await agent.destroy();
      this.container.unregister(agentId);
      logger.info("Agent destroyed", { agentId });
    }
  }

  /**
   * Dispose the ecosystem and clean up resources
   */
  dispose(): void {
    // Destroy all agents
    for (const agent of this.container.list()) {
      agent.destroy().catch((err) => {
        logger.error("Error destroying agent during dispose", { error: err });
      });
    }
    this.container.clear();

    this.bus.destroy();

    if (this.repository instanceof SQLiteRepository) {
      this.repository.close();
    }

    logger.info("AgentRuntime disposed");
  }

  // ============================================================================
  // Private: Sandbox Factory
  // ============================================================================

  /**
   * Create a sandbox for an agent
   */
  private createSandbox(agentId: string): Sandbox {
    const workspace: Workspace = {
      id: agentId,
      name: `workspace_${agentId}`,
      path: join(this.basePath, "workspaces", agentId),
    };

    return {
      name: `sandbox_${agentId}`,
      workspace,
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private resolveLoggerFactory(
    config: LoggerFactory | FileLoggerFactoryOptions | undefined
  ): LoggerFactory {
    if (config && "getLogger" in config) {
      return config;
    }
    return new FileLoggerFactory(config);
  }

  private resolveLLMProvider(
    config: LLMProvider<LLMSupply> | Partial<LLMSupply> | undefined
  ): LLMProvider<LLMSupply> {
    if (config && "provide" in config) {
      return config;
    }

    // If partial config provided, create wrapper provider
    if (config) {
      return {
        name: "custom",
        provide: () => {
          const env = new EnvLLMProvider().provide();
          return {
            apiKey: config.apiKey ?? env.apiKey,
            baseUrl: config.baseUrl ?? env.baseUrl,
            model: config.model ?? env.model,
          };
        },
      };
    }

    return new EnvLLMProvider();
  }

  private resolveRepository(config: Repository | { path?: string } | undefined): Repository {
    if (config && "saveImage" in config) {
      return config;
    }

    const dbPath = (config as { path?: string })?.path ?? join(this.basePath, "data", "agentx.db");
    return new SQLiteRepository(dbPath);
  }
}

/**
 * Create an AgentRuntime with optional configuration
 *
 * @example
 * ```typescript
 * // Use all defaults (reads LLM_PROVIDER_KEY from env)
 * const runtime = createRuntime();
 *
 * // Custom LLM model
 * const runtime = createRuntime({
 *   llm: { model: "claude-sonnet-4-20250514" },
 * });
 *
 * // Custom database path
 * const runtime = createRuntime({
 *   repository: { path: "/custom/path/agentx.db" },
 * });
 * ```
 */
export function createRuntime(config?: AgentRuntimeConfig): AgentRuntime {
  return new AgentRuntime(config);
}
