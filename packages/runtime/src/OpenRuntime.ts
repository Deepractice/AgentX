/**
 * OpenRuntime - Open source Runtime implementation
 *
 * Implements Runtime interface for Node.js platform.
 * Creates and manages Containers, which in turn manage Agents.
 *
 * Architecture:
 * ```
 * OpenRuntime
 *   ├── bus: SystemBus (singleton, shared)
 *   └── createContainer(containerId) → ContainerImpl
 *         └── run(definition) → Agent
 * ```
 *
 * @example
 * ```typescript
 * import { openRuntime } from "@agentxjs/runtime";
 *
 * const runtime = openRuntime();
 * const container = runtime.createContainer("my-container");
 * const agent = container.run({ name: "Assistant", systemPrompt: "..." });
 *
 * agent.on("text_delta", (e) => console.log(e.data.text));
 * await agent.receive("Hello!");
 *
 * runtime.dispose();
 * ```
 */

import type {
  Runtime,
  Container,
  LoggerFactory,
  Unsubscribe,
} from "@agentxjs/types";
import { Subject } from "rxjs";
import { createLogger, setLoggerFactory } from "@agentxjs/common";
import { SystemBusImpl } from "./SystemBusImpl";
import { ContainerImpl } from "./container";
import { FileLoggerFactory, type FileLoggerFactoryOptions } from "./runtime";
import { homedir } from "node:os";
import { join } from "node:path";

const logger = createLogger("runtime/OpenRuntime");

/**
 * OpenRuntime configuration
 */
export interface OpenRuntimeConfig {
  /**
   * Logger factory or config
   * @default FileLoggerFactory at ~/.agentx/logs/
   */
  logger?: LoggerFactory | FileLoggerFactoryOptions;

  /**
   * Base path for all AgentX data
   * @default ~/.agentx
   */
  basePath?: string;
}

/**
 * OpenRuntime - Open source Runtime implementation
 */
export class OpenRuntime implements Runtime {
  private readonly bus: SystemBusImpl;
  private readonly loggerFactory: LoggerFactory;
  private readonly basePath: string;
  private readonly containers = new Map<string, Container>();
  private readonly eventSubject = new Subject<unknown>();

  constructor(config: OpenRuntimeConfig = {}) {
    this.basePath = config.basePath ?? join(homedir(), ".agentx");

    // 1. Initialize logger factory first
    this.loggerFactory = this.resolveLoggerFactory(config.logger);
    setLoggerFactory(this.loggerFactory);

    logger.info("Initializing OpenRuntime");

    // 2. Create SystemBus (singleton for this runtime)
    this.bus = new SystemBusImpl();

    logger.info("OpenRuntime initialized", { basePath: this.basePath });
  }

  // ==================== Container Management ====================

  /**
   * Create a Container for managing Agent instances
   */
  createContainer(containerId: string): Container {
    // Check if container already exists
    const existing = this.containers.get(containerId);
    if (existing) {
      logger.debug("Returning existing container", { containerId });
      return existing;
    }

    logger.info("Creating container", { containerId });

    const container = new ContainerImpl({
      containerId,
      bus: this.bus,
      basePath: this.basePath,
    });

    this.containers.set(containerId, container);

    return container;
  }

  // ==================== Event Infrastructure ====================

  /**
   * Subscribe to runtime events
   */
  on(handler: (event: unknown) => void): Unsubscribe {
    const subscription = this.eventSubject.subscribe(handler);

    // Also subscribe to SystemBus
    const busUnsub = this.bus.onAny(handler);

    return () => {
      subscription.unsubscribe();
      busUnsub();
    };
  }

  /**
   * Emit an event to the runtime
   */
  emit(event: unknown): void {
    this.eventSubject.next(event);
    this.bus.emit(event as any);
  }

  // ==================== Lifecycle ====================

  /**
   * Dispose runtime and all containers
   */
  dispose(): void {
    logger.info("Disposing OpenRuntime");

    // Dispose all containers
    for (const container of this.containers.values()) {
      container.dispose().catch((err) => {
        logger.error("Error disposing container", { error: err });
      });
    }
    this.containers.clear();

    // Destroy bus
    this.bus.destroy();

    // Complete event subject
    this.eventSubject.complete();

    logger.info("OpenRuntime disposed");
  }

  // ==================== Private Helpers ====================

  private resolveLoggerFactory(
    config: LoggerFactory | FileLoggerFactoryOptions | undefined
  ): LoggerFactory {
    if (config && "getLogger" in config) {
      return config;
    }
    return new FileLoggerFactory(config);
  }
}

/**
 * Create an open source Runtime
 *
 * @example
 * ```typescript
 * // Default configuration
 * const runtime = openRuntime();
 *
 * // Custom base path
 * const runtime = openRuntime({
 *   basePath: "/custom/path",
 * });
 * ```
 */
export function openRuntime(config?: OpenRuntimeConfig): Runtime {
  return new OpenRuntime(config);
}
