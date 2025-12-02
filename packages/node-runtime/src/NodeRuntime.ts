/**
 * NodeRuntime - Node.js Runtime implementation
 *
 * "Define Once, Run Anywhere"
 *
 * Provides Runtime for Node.js with Claude driver.
 * RuntimeConfig is collected from environment (env vars, config files).
 * AgentDefinition (business config) is passed by user.
 */

import type {
  Runtime,
  Container,
  Sandbox,
  RuntimeDriver,
  AgentContext,
  AgentDefinition,
  Repository,
  Workspace,
  LLMProvider,
  Agent,
  AgentImage,
  Session,
  LoggerFactory,
} from "@agentxjs/types";
import { AgentInstance } from "@agentxjs/agent";
import { AgentEngine } from "@agentxjs/engine";
import { createLogger, setLoggerFactory } from "@agentxjs/common";
import { createClaudeDriver, type ClaudeDriverOptions } from "./driver/ClaudeDriver";
import type { LLMSupply } from "./llm";
import { envLLM, sqlite, fileLogger } from "./providers";
import { homedir } from "node:os";
import { join } from "node:path";
import type { EnvLLMConfig, SQLiteConfig, FileLoggerConfig } from "./providers";

const logger = createLogger("node/NodeRuntime");

// ============================================================================
// NodeRuntimeConfig - Configuration for nodeRuntime factory
// ============================================================================

/**
 * Node Runtime Configuration
 *
 * All fields are optional. Defaults are used if not provided.
 */
export interface NodeRuntimeConfig {
  /**
   * LLM provider configuration
   * @default envLLM() - reads from environment variables
   */
  llm?: LLMProvider<LLMSupply> | EnvLLMConfig;

  /**
   * Repository configuration
   * @default sqlite() - uses ~/.agentx/data/agentx.db
   */
  repository?: Repository | SQLiteConfig;

  /**
   * Logger factory configuration
   * @default fileLogger() - writes to ~/.agentx/logs/
   */
  logger?: LoggerFactory | FileLoggerConfig;
}

// ============================================================================
// NodeContainer - Node.js Container implementation
// ============================================================================

/**
 * NodeContainer - Server-side Container implementation
 *
 * Manages Agent lifecycle with Claude SDK integration.
 * Persists driverState to Repository for resume capability.
 */
class NodeContainer implements Container {
  readonly id: string;
  private readonly agents = new Map<string, Agent>();
  private readonly runtime: Runtime;
  private readonly engine: AgentEngine;
  private readonly repository: Repository;

  constructor(id: string, runtime: Runtime, engine: AgentEngine, repository: Repository) {
    this.id = id;
    this.runtime = runtime;
    this.engine = engine;
    this.repository = repository;
  }

  async run(image: AgentImage): Promise<Agent> {
    logger.info("Running agent from image", { imageId: image.imageId });

    // Generate agentId
    const agentId = this.generateAgentId();

    // Create context
    const context: AgentContext = {
      agentId,
      createdAt: Date.now(),
    };

    // Create sandbox
    const sandbox = this.runtime.createSandbox(`sandbox-${agentId}`);

    // Get LLM config from sandbox (provided by EnvLLMProvider)
    const llmSupply = (sandbox.llm as LLMProvider<LLMSupply>).provide();

    // Create driver config
    const driverConfig = {
      apiKey: llmSupply.apiKey,
      baseUrl: llmSupply.baseUrl,
      model: llmSupply.model,
      systemPrompt: image.definition.systemPrompt,
    };

    // Create driver with session ID capture callback
    const driverOptions: ClaudeDriverOptions = {
      onSessionIdCaptured: async (sdkSessionId) => {
        // Persist driverState to Repository
        await this.updateImageDriverState(image.imageId, { sdkSessionId });
        logger.debug("Driver state persisted", {
          imageId: image.imageId,
          sdkSessionId,
        });
      },
    };

    const driver = createClaudeDriver(driverConfig, context, sandbox, driverOptions);

    // Create agent
    const agent = new AgentInstance(image.definition, context, this.engine, driver, sandbox);

    // Register agent
    this.agents.set(agentId, agent);

    logger.info("Agent started from image", {
      agentId,
      imageId: image.imageId,
      definitionName: image.definition.name,
    });

    return agent;
  }

  async resume(session: Session): Promise<Agent> {
    logger.info("Resuming agent from session", {
      sessionId: session.sessionId,
      imageId: session.imageId,
    });

    // Get image from repository
    const imageRecord = await this.repository.findImageById(session.imageId);
    if (!imageRecord) {
      throw new Error(`Image not found: ${session.imageId}`);
    }

    // Get sdkSessionId from persisted driverState
    const sdkSessionId = imageRecord.driverState?.sdkSessionId as string | undefined;

    // Generate agentId
    const agentId = this.generateAgentId();

    // Create context
    const context: AgentContext = {
      agentId,
      createdAt: Date.now(),
    };

    // Create sandbox
    const sandbox = this.runtime.createSandbox(`sandbox-${agentId}`);

    // Get LLM config from sandbox (provided by EnvLLMProvider)
    const llmSupply = (sandbox.llm as LLMProvider<LLMSupply>).provide();

    // Create driver config
    const definition = imageRecord.definition as unknown as AgentDefinition;
    const driverConfig = {
      apiKey: llmSupply.apiKey,
      baseUrl: llmSupply.baseUrl,
      model: llmSupply.model,
      systemPrompt: definition.systemPrompt,
    };

    // Create driver with resume session ID and capture callback
    const driverOptions: ClaudeDriverOptions = {
      resumeSessionId: sdkSessionId,
      onSessionIdCaptured: async (newSdkSessionId) => {
        // Update driverState (may be new if resume created a fork)
        await this.updateImageDriverState(session.imageId, { sdkSessionId: newSdkSessionId });
        logger.debug("Driver state updated on resume", {
          imageId: session.imageId,
          sdkSessionId: newSdkSessionId,
        });
      },
    };

    const driver = createClaudeDriver(driverConfig, context, sandbox, driverOptions);

    // Create agent
    const agent = new AgentInstance(definition, context, this.engine, driver, sandbox);

    // Register agent
    this.agents.set(agentId, agent);

    logger.info("Agent resumed from session", {
      agentId,
      sessionId: session.sessionId,
      imageId: session.imageId,
      hadDriverState: !!sdkSessionId,
    });

    return agent;
  }

  /**
   * Update driverState for an image in Repository
   */
  private async updateImageDriverState(
    imageId: string,
    driverState: Record<string, unknown>
  ): Promise<void> {
    const imageRecord = await this.repository.findImageById(imageId);
    if (imageRecord) {
      // Merge with existing driverState
      imageRecord.driverState = {
        ...imageRecord.driverState,
        ...driverState,
      };
      await this.repository.saveImage(imageRecord);
    }
  }

  async destroy(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      logger.warn("Agent not found for destroy", { agentId });
      return;
    }

    logger.debug("Destroying agent", { agentId });
    await agent.destroy();
    this.agents.delete(agentId);
    logger.info("Agent destroyed", { agentId });
  }

  get(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  has(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  list(): Agent[] {
    return Array.from(this.agents.values());
  }

  async destroyAll(): Promise<void> {
    const agentIds = Array.from(this.agents.keys());
    logger.debug("Destroying all agents", { count: agentIds.length });
    await Promise.all(agentIds.map((id) => this.destroy(id)));
    logger.info("All agents destroyed", { count: agentIds.length });
  }

  private generateAgentId(): string {
    return `agent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// ============================================================================
// NodeSandbox - Node.js Sandbox with EnvLLMProvider
// ============================================================================

class NodeSandbox implements Sandbox {
  readonly name: string;
  readonly workspace: Workspace;
  readonly llm: LLMProvider<LLMSupply>;

  constructor(name: string, workspace: Workspace, llmProvider: LLMProvider<LLMSupply>) {
    this.name = name;
    this.workspace = workspace;
    this.llm = llmProvider;
  }
}

// ============================================================================
// NodeRuntime - Main Runtime implementation
// ============================================================================

/**
 * Helper to check if value is an instance (has methods) vs plain config object
 */
function isInstance<T>(value: unknown, methodName: string): value is T {
  return typeof value === "object" && value !== null && methodName in value;
}

/**
 * NodeRuntime - Runtime for Node.js with Claude driver
 *
 * Supports dependency injection via config:
 * - llm: LLM provider (default: envLLM - reads from environment)
 * - repository: Data persistence (default: sqlite)
 * - logger: Logging factory (default: fileLogger)
 *
 * Environment Variables (for default envLLM):
 * - LLM_PROVIDER_KEY (required) - API key for LLM provider
 * - LLM_PROVIDER_URL (optional) - Base URL for API endpoint
 * - LLM_PROVIDER_MODEL (optional) - Model name
 */
class NodeRuntime implements Runtime {
  readonly name = "node";
  readonly container: Container;
  readonly repository: Repository;
  readonly loggerFactory: LoggerFactory;
  private readonly engine: AgentEngine;
  private readonly llmProvider: LLMProvider<LLMSupply>;
  private readonly basePath: string;

  constructor(config: NodeRuntimeConfig = {}) {
    // Set base path for all agentx data
    this.basePath = join(homedir(), ".agentx");

    // Resolve logger (first, so we can log during initialization)
    if (isInstance<LoggerFactory>(config.logger, "getLogger")) {
      this.loggerFactory = config.logger;
    } else {
      this.loggerFactory = fileLogger(config.logger);
    }

    // Set as global logger factory
    setLoggerFactory(this.loggerFactory);

    // Resolve LLM provider
    if (isInstance<LLMProvider<LLMSupply>>(config.llm, "provide")) {
      this.llmProvider = config.llm;
    } else {
      this.llmProvider = envLLM(config.llm);
    }

    // Resolve repository
    if (isInstance<Repository>(config.repository, "saveImage")) {
      this.repository = config.repository;
    } else {
      this.repository = sqlite(config.repository);
    }

    // Create shared engine
    this.engine = new AgentEngine();

    // Create container with runtime, engine, and repository
    this.container = new NodeContainer("node-container", this, this.engine, this.repository);

    logger.info("NodeRuntime initialized");
  }

  createSandbox(name: string): Sandbox {
    logger.debug("Creating sandbox", { name });

    // Create workspace with path under ~/.agentx/workspaces/
    const workspaceId = name.replace("sandbox-", "ws-");
    const workspace: Workspace = {
      id: workspaceId,
      name: workspaceId,
      path: `${this.basePath}/workspaces/${workspaceId}`,
    };

    return new NodeSandbox(name, workspace, this.llmProvider);
  }

  createDriver(
    definition: AgentDefinition,
    context: AgentContext,
    sandbox: Sandbox
  ): RuntimeDriver {
    logger.debug("Creating driver", { agentId: context.agentId, name: definition.name });

    // Get LLM config from sandbox (provided by EnvLLMProvider)
    const llmSupply = (sandbox.llm as LLMProvider<LLMSupply>).provide();

    // Merge AgentDefinition (business) + LLMSupply (infrastructure)
    const driverConfig = {
      apiKey: llmSupply.apiKey,
      baseUrl: llmSupply.baseUrl,
      model: llmSupply.model,
      systemPrompt: definition.systemPrompt,
    };

    return createClaudeDriver(driverConfig, context, sandbox);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a Node.js Runtime with optional configuration
 *
 * @example
 * ```typescript
 * import { createAgentX } from "agentxjs";
 * import { nodeRuntime, envLLM, sqlite } from "agentxjs/runtime/node";
 *
 * // Use all defaults
 * createAgentX(nodeRuntime());
 *
 * // Custom configuration
 * createAgentX(nodeRuntime({
 *   llm: envLLM({ model: "claude-sonnet-4" }),
 *   repository: sqlite({ path: "/custom/db.sqlite" }),
 * }));
 *
 * // Simple config (auto-wrapped with factory)
 * createAgentX(nodeRuntime({
 *   llm: { model: "claude-sonnet-4" },
 *   repository: { path: "/custom/db.sqlite" },
 * }));
 * ```
 */
export function nodeRuntime(config?: NodeRuntimeConfig): Runtime {
  return new NodeRuntime(config);
}

// ============================================================================
// Legacy Export (for backward compatibility)
// ============================================================================

/**
 * Node.js Runtime singleton (legacy)
 *
 * @deprecated Use `nodeRuntime()` factory instead
 *
 * @example
 * ```typescript
 * // Old way (deprecated)
 * import { runtime } from "agentxjs/runtime/node";
 * createAgentX(runtime);
 *
 * // New way (recommended)
 * import { nodeRuntime } from "agentxjs/runtime/node";
 * createAgentX(nodeRuntime());
 * ```
 */
export const runtime: Runtime = new NodeRuntime();

// Also export class for advanced use
export { NodeRuntime };
