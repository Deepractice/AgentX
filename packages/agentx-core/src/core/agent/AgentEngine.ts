/**
 * AgentEngine
 *
 * Runtime orchestration layer that manages all Reactors using ReactorRegistry.
 *
 * Responsibilities:
 * 1. Create and manage EventBus
 * 2. Register and initialize all Reactors:
 *    - AgentDriverBridge → Stream Events
 *    - StateMachineReactor → State Events
 *    - MessageAssemblerReactor → Message Events
 *    - ExchangeTrackerReactor → Exchange Events
 *    - User-provided Reactors
 * 3. Lifecycle management (initialize, destroy)
 *
 * Architecture (NEW - Reactor-based):
 * ```
 * AgentEngine
 *   ├── EventBus (communication backbone)
 *   └── ReactorRegistry
 *         ├── AgentDriverBridge
 *         ├── StateMachineReactor
 *         ├── MessageAssemblerReactor
 *         ├── ExchangeTrackerReactor
 *         └── User Reactors
 * ```
 *
 * Example:
 * ```typescript
 * const driver = new ClaudeDriver(config);
 * const engine = new AgentEngine(driver, logger, {
 *   reactors: [new MyCustomReactor()]
 * });
 *
 * await engine.initialize();
 *
 * // All Reactors are now active and processing events
 * const consumer = engine.eventBus.createConsumer();
 * consumer.consumeByType("assistant_message", handleMessage);
 *
 * await engine.destroy();
 * ```
 */

import { AgentEventBus } from "./AgentEventBus";
import { AgentStateMachine } from "./AgentStateMachine";
import { AgentMessageAssembler } from "./AgentMessageAssembler";
import { AgentExchangeTracker } from "./AgentExchangeTracker";
import { AgentDriverBridge } from "./AgentDriverBridge";
import { AgentReactorRegistry } from "./AgentReactorRegistry";
import type { AgentDriver } from "~/interfaces/AgentDriver";
import type { AgentReactor } from "~/interfaces/AgentReactor";
import { createLogger, type LoggerProvider } from "@deepractice-ai/agentx-logger";

/**
 * Runtime configuration
 */
export interface EngineConfig {
  /**
   * User-provided AgentReactors to register
   */
  reactors?: AgentReactor[];
}

/**
 * AgentEngine
 *
 * Orchestrates all Reactors using ReactorRegistry.
 */
export class AgentEngine {
  readonly agentId: string;
  readonly sessionId: string;

  // Core components
  readonly eventBus: AgentEventBus;
  private readonly registry: AgentReactorRegistry;
  private readonly driver: AgentDriver;
  private readonly logger: LoggerProvider;

  private isInitialized = false;

  constructor(driver: AgentDriver, config?: EngineConfig) {
    this.driver = driver;
    this.agentId = this.generateId();
    this.sessionId = driver.sessionId;
    this.logger = createLogger(`core/agent/AgentEngine/${this.agentId}`);

    this.logger.info("Creating AgentEngine", {
      agentId: this.agentId,
      sessionId: this.sessionId,
      driverType: driver.constructor.name,
    });

    // Create EventBus
    this.eventBus = new AgentEventBus();
    this.logger.debug("EventBus created");

    // Create AgentReactorRegistry
    this.registry = new AgentReactorRegistry(this.eventBus, {
      agentId: this.agentId,
      sessionId: this.sessionId,
    });
    this.logger.debug("ReactorRegistry created");

    // Register core Reactors (order matters!)
    this.logger.debug("Registering core reactors");
    this.registry.register(new AgentDriverBridge(driver));
    this.registry.register(new AgentStateMachine());
    this.registry.register(new AgentMessageAssembler());
    this.registry.register(new AgentExchangeTracker());

    // Register user-provided Reactors
    if (config?.reactors) {
      this.logger.info("Registering user reactors", {
        count: config.reactors.length,
      });
      this.registry.registerAll(config.reactors);
    }

    this.logger.info("AgentEngine created successfully");
  }

  /**
   * Initialize engine and start all Reactors
   *
   * Steps:
   * 1. Initialize ReactorRegistry (which initializes all Reactors)
   * 2. Mark as initialized
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.debug("Engine already initialized");
      return;
    }

    this.logger.info("Initializing AgentEngine");

    // Initialize all Reactors via ReactorRegistry
    await this.registry.initialize();

    this.isInitialized = true;
    this.logger.info("AgentEngine initialized successfully");
  }

  /**
   * Abort current operation
   */
  abort(): void {
    this.logger.debug("Aborting current operation");
    this.driver.abort();
  }

  /**
   * Destroy engine and clean up all resources
   *
   * Steps:
   * 1. Destroy ReactorRegistry (which destroys all Reactors in reverse order)
   * 2. Close EventBus
   */
  async destroy(): Promise<void> {
    this.logger.info("Destroying AgentEngine");

    // Destroy all Reactors via ReactorRegistry (reverse order)
    await this.registry.destroy();
    this.logger.debug("All reactors destroyed");

    // Close EventBus
    this.eventBus.close();
    this.logger.debug("EventBus closed");

    this.isInitialized = false;
    this.logger.info("AgentEngine destroyed successfully");
  }

  private generateId(): string {
    return `agent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
