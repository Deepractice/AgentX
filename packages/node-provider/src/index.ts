/**
 * @agentxjs/node-provider
 *
 * Node.js platform provider for AgentX.
 * Provides implementations for persistence, workspace, and network.
 *
 * @example
 * ```typescript
 * // Function style (recommended)
 * import { createServer } from "@agentxjs/server";
 * import { nodeProvider } from "@agentxjs/node-provider";
 * import { createClaudeDriver } from "@agentxjs/claude-driver";
 *
 * const server = await createServer({
 *   provider: nodeProvider({
 *     dataPath: "./data",
 *     createDriver: createClaudeDriver,
 *   }),
 * });
 * ```
 */

import type { AgentXProvider } from "@agentxjs/core/runtime";
import type { CreateDriver } from "@agentxjs/core/driver";
import type { LogLevel } from "commonxjs/logger";
import { setLoggerFactory } from "commonxjs/logger";
import { EventBusImpl } from "@agentxjs/core/event";
import { createPersistence, sqliteDriver } from "./persistence";
import { FileWorkspaceProvider } from "./workspace/FileWorkspaceProvider";
import { FileLoggerFactory } from "./logger";
import { join } from "node:path";

/**
 * Options for creating a Node provider
 */
export interface NodeProviderOptions {
  /**
   * Base path for data storage
   * @default "./data"
   */
  dataPath?: string;

  /**
   * LLM Driver factory function - creates Driver per Agent
   * Required for running agents
   */
  createDriver?: CreateDriver;

  /**
   * Directory for log files
   * If provided, enables file logging instead of console
   * @example ".agentx/logs"
   */
  logDir?: string;

  /**
   * Log level
   * @default "debug" for file logging, "info" for console
   */
  logLevel?: LogLevel;
}

/**
 * Deferred provider config - resolved lazily
 */
export interface DeferredProviderConfig {
  readonly __deferred: true;
  readonly options: NodeProviderOptions;
  resolve(): Promise<AgentXProvider>;
}

/**
 * Create a Node.js provider configuration (deferred initialization)
 *
 * Use this for function-style API. The provider is initialized lazily.
 *
 * @param options - Provider options
 * @returns Deferred provider config
 *
 * @example
 * ```typescript
 * const server = await createServer({
 *   provider: nodeProvider({ dataPath: "./data" }),
 * });
 * ```
 */
export function nodeProvider(options: NodeProviderOptions = {}): DeferredProviderConfig {
  return {
    __deferred: true,
    options,
    resolve: () => createNodeProvider(options),
  };
}

/**
 * Create a Node.js provider for AgentX (immediate initialization)
 *
 * @param options - Provider options
 * @returns AgentXProvider instance
 */
export async function createNodeProvider(
  options: NodeProviderOptions = {}
): Promise<AgentXProvider> {
  const dataPath = options.dataPath ?? "./data";

  // Configure file logging if logDir is provided
  if (options.logDir) {
    const loggerFactory = new FileLoggerFactory({
      logDir: options.logDir,
      level: options.logLevel ?? "debug",
    });
    setLoggerFactory(loggerFactory);
  }

  // Create persistence with SQLite
  const persistence = await createPersistence(sqliteDriver({ path: join(dataPath, "agentx.db") }));

  // Create workspace provider
  const workspaceProvider = new FileWorkspaceProvider({
    basePath: join(dataPath, "workspaces"),
  });

  // Create event bus
  const eventBus = new EventBusImpl();

  // Create placeholder driver factory if not provided
  const createDriver: CreateDriver = options.createDriver ?? (() => {
    throw new Error(
      "createDriver not configured. Please provide a createDriver function in NodeProviderOptions."
    );
  });

  return {
    containerRepository: persistence.containers,
    imageRepository: persistence.images,
    sessionRepository: persistence.sessions,
    workspaceProvider,
    createDriver,
    eventBus,
  };
}

/**
 * Check if value is a deferred provider config
 */
export function isDeferredProvider(value: unknown): value is DeferredProviderConfig {
  return (
    typeof value === "object" &&
    value !== null &&
    "__deferred" in value &&
    (value as DeferredProviderConfig).__deferred === true
  );
}

// Re-export persistence
export * from "./persistence";

// Re-export workspace
export {
  FileWorkspaceProvider,
  type FileWorkspaceProviderOptions,
} from "./workspace/FileWorkspaceProvider";

// Re-export mq
export { SqliteMessageQueue, OffsetGenerator } from "./mq";

// Re-export network
export { WebSocketServer, WebSocketConnection } from "./network";

// Re-export logger
export { FileLoggerFactory, type FileLoggerFactoryOptions } from "./logger";
