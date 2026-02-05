/**
 * @agentxjs/node-platform
 *
 * Node.js platform for AgentX.
 * Provides implementations for persistence, bash, and network.
 *
 * @example
 * ```typescript
 * import { createNodePlatform } from "@agentxjs/node-platform";
 *
 * const platform = await createNodePlatform({ dataPath: "./data" });
 * ```
 */

import type { AgentXPlatform } from "@agentxjs/core/runtime";
import type { LogLevel } from "commonxjs/logger";
import { setLoggerFactory } from "commonxjs/logger";
import { EventBusImpl } from "@agentxjs/core/event";
import { createPersistence, sqliteDriver } from "./persistence";
import { NodeBashProvider } from "./bash/NodeBashProvider";
import { FileLoggerFactory } from "./logger";
import { join } from "node:path";

/**
 * Options for creating a Node platform
 */
export interface NodePlatformOptions {
  /**
   * Base path for data storage
   * @default "./data"
   */
  dataPath?: string;

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
 * Deferred platform config - resolved lazily
 */
export interface DeferredPlatformConfig {
  readonly __deferred: true;
  readonly options: NodePlatformOptions;
  resolve(): Promise<AgentXPlatform>;
}

/**
 * Create a Node.js platform configuration (deferred initialization)
 *
 * Use this for function-style API. The platform is initialized lazily.
 *
 * @param options - Platform options
 * @returns Deferred platform config
 *
 * @example
 * ```typescript
 * const server = await createServer({
 *   platform: nodePlatform({ dataPath: "./data" }),
 * });
 * ```
 */
export function nodePlatform(options: NodePlatformOptions = {}): DeferredPlatformConfig {
  return {
    __deferred: true,
    options,
    resolve: () => createNodePlatform(options),
  };
}

/**
 * Create a Node.js platform for AgentX (immediate initialization)
 *
 * @param options - Platform options
 * @returns AgentXPlatform instance
 */
export async function createNodePlatform(
  options: NodePlatformOptions = {}
): Promise<AgentXPlatform> {
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

  // Create bash provider
  const bashProvider = new NodeBashProvider();

  // Create event bus
  const eventBus = new EventBusImpl();

  return {
    containerRepository: persistence.containers,
    imageRepository: persistence.images,
    sessionRepository: persistence.sessions,
    eventBus,
    bashProvider,
  };
}

/**
 * Check if value is a deferred platform config
 */
export function isDeferredPlatform(value: unknown): value is DeferredPlatformConfig {
  return (
    typeof value === "object" &&
    value !== null &&
    "__deferred" in value &&
    (value as DeferredPlatformConfig).__deferred === true
  );
}

// Re-export persistence
export * from "./persistence";

// Re-export bash
export { NodeBashProvider } from "./bash/NodeBashProvider";

// Re-export mq
export { SqliteMessageQueue, OffsetGenerator } from "./mq";

// Re-export network
export { WebSocketServer, WebSocketConnection } from "./network";

// Re-export logger
export { FileLoggerFactory, type FileLoggerFactoryOptions } from "./logger";
