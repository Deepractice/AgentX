/**
 * NodeEcosystem - Node.js Ecosystem implementation
 *
 * Assembles all ecosystem components:
 * - SystemBus: Central event bus for all communication
 * - Environment: ClaudeEnvironment (Receptor + Effector)
 * - Repository: SQLite storage
 * - LLM Provider: Environment-based configuration
 * - Logger: File-based logging
 *
 * @example
 * ```typescript
 * import { nodeEcosystem } from "@agentxjs/node-ecosystem";
 *
 * const ecosystem = nodeEcosystem({
 *   llm: { model: "claude-sonnet-4-20250514" },
 * });
 *
 * // Subscribe to all events
 * ecosystem.bus.onAny((event) => {
 *   console.log("Event:", event.type);
 * });
 *
 * // Clean up
 * ecosystem.dispose();
 * ```
 */

import type {
  SystemBus,
  Environment,
  Repository,
  LLMProvider,
  LoggerFactory,
} from "@agentxjs/types";
import { setLoggerFactory } from "@agentxjs/common";
import { SystemBusImpl } from "./SystemBusImpl";
import { ClaudeEnvironment, type ClaudeEnvironmentConfig } from "./environment";
import { SQLiteRepository, EnvLLMProvider, FileLoggerFactory } from "./runtime";
import type { LLMSupply, FileLoggerFactoryOptions } from "./runtime";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * NodeEcosystem configuration
 */
export interface NodeEcosystemConfig {
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
 * NodeEcosystem - Assembled ecosystem for Node.js
 */
export class NodeEcosystem {
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

  private readonly basePath: string;

  constructor(config: NodeEcosystemConfig = {}) {
    this.basePath = join(homedir(), ".agentx");

    // 1. Create logger factory first (for logging during init)
    this.loggerFactory = this.resolveLoggerFactory(config.logger);
    setLoggerFactory(this.loggerFactory);

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
  }

  /**
   * Dispose the ecosystem and clean up resources
   */
  dispose(): void {
    this.bus.destroy();

    if (this.repository instanceof SQLiteRepository) {
      this.repository.close();
    }
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
 * Create a Node.js Ecosystem with optional configuration
 *
 * @example
 * ```typescript
 * // Use all defaults (reads LLM_PROVIDER_KEY from env)
 * const ecosystem = nodeEcosystem();
 *
 * // Custom LLM model
 * const ecosystem = nodeEcosystem({
 *   llm: { model: "claude-sonnet-4-20250514" },
 * });
 *
 * // Custom database path
 * const ecosystem = nodeEcosystem({
 *   repository: { path: "/custom/path/agentx.db" },
 * });
 * ```
 */
export function nodeEcosystem(config?: NodeEcosystemConfig): NodeEcosystem {
  return new NodeEcosystem(config);
}
