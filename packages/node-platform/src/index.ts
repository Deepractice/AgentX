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

import { homedir } from "node:os";
import { join } from "node:path";
import type { ContextProvider } from "@agentxjs/core/context";
import { RolexContextProvider } from "@agentxjs/core/context";
import { EventBusImpl } from "@agentxjs/core/event";
import type { AgentXPlatform } from "@agentxjs/core/runtime";
import { localPlatform } from "@rolexjs/local-platform";
import type { LogLevel } from "commonxjs/logger";
import { ConsoleLogger, setLoggerFactory } from "commonxjs/logger";
import { NodeBashProvider } from "./bash/NodeBashProvider";
import { FileLoggerFactory } from "./logger";
import { createPersistence, sqliteDriver } from "./persistence";

/**
 * Options for creating a Node platform
 */
export interface NodePlatformOptions {
  /**
   * Base path for AgentX data storage
   * @default "~/.deepractice/agentx"
   */
  dataPath?: string;

  /**
   * Base path for RoleX data storage
   * @default "~/.deepractice/rolex"
   */
  rolexDataPath?: string;

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

  /**
   * Custom context provider — overrides the built-in RolexContextProvider.
   * By default, node-platform creates a RolexContextProvider automatically.
   * Set to `null` to disable context provider entirely.
   */
  contextProvider?: ContextProvider | null;
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
  const deepracticeHome = join(homedir(), ".deepractice");
  const dataPath = options.dataPath ?? join(deepracticeHome, "agentx");
  const rolexDataPath = options.rolexDataPath ?? join(deepracticeHome, "rolex");

  // Configure logging
  if (options.logDir) {
    const loggerFactory = new FileLoggerFactory({
      logDir: options.logDir,
      level: options.logLevel ?? "debug",
    });
    setLoggerFactory(loggerFactory);
  } else if (options.logLevel) {
    setLoggerFactory({
      getLogger: (name: string) => new ConsoleLogger(name, { level: options.logLevel }),
    });
  }

  // Create persistence with SQLite
  const persistence = await createPersistence(sqliteDriver({ path: join(dataPath, "agentx.db") }));

  // Create context provider (built-in RoleX by default)
  let contextProvider: ContextProvider | undefined;
  if (options.contextProvider === null) {
    // Explicitly disabled
    contextProvider = undefined;
  } else if (options.contextProvider) {
    // Custom provider
    contextProvider = options.contextProvider;
  } else {
    // Default: RoleX local platform
    const rolexPlatform = localPlatform({ dataDir: rolexDataPath });
    contextProvider = new RolexContextProvider(rolexPlatform);
  }

  // Create bash provider
  const bashProvider = new NodeBashProvider();

  // Create event bus
  const eventBus = new EventBusImpl();

  // Create channel client factory (uses ws library for Node.js)
  const { createNodeWebSocket } = await import("./network/WebSocketFactory");

  // Create channel server (uses ws library for Node.js)
  const { WebSocketServer } = await import("./network");
  const channelServer = new WebSocketServer({
    heartbeat: true,
    heartbeatInterval: 30000,
  });

  return {
    containerRepository: persistence.containers,
    imageRepository: persistence.images,
    sessionRepository: persistence.sessions,
    llmProviderRepository: persistence.llmProviders,
    contextProvider,
    eventBus,
    bashProvider,
    channelServer,
    channelClient: createNodeWebSocket,
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

// Re-export bash
export { NodeBashProvider } from "./bash/NodeBashProvider";
// Re-export logger
export { FileLoggerFactory, type FileLoggerFactoryOptions } from "./logger";

// Re-export mq
export { OffsetGenerator, SqliteMessageQueue } from "./mq";

// Re-export network
export { WebSocketConnection, WebSocketServer } from "./network";
// Re-export persistence
export * from "./persistence";
