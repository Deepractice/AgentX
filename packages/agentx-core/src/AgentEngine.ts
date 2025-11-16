/**
 * AgentEngine
 *
 * Runtime orchestration layer that manages all Reactors using ReactorRegistry.
 *
 * Responsibilities:
 * 1. Create and manage EventBus
 * 2. Register and initialize all Reactors:
 *    - DriverReactor → Stream Events
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
 *         ├── DriverReactor
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
import { DriverReactor } from "./driver/DriverReactor";
import { ReactorRegistry } from "./reactor/ReactorRegistry";
import type { AgentDriver } from "./driver";
import type { AgentLogger } from "./AgentLogger";
import type { Reactor } from "./reactor/Reactor";

/**
 * Runtime configuration
 */
export interface EngineConfig {
  /**
   * User-provided Reactors to register
   */
  reactors?: Reactor[];
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
  private readonly registry: ReactorRegistry;
  private readonly driver: AgentDriver;
  private readonly logger?: AgentLogger;

  private isInitialized = false;

  constructor(driver: AgentDriver, logger?: AgentLogger, config?: EngineConfig) {
    this.driver = driver;
    this.logger = logger;
    this.agentId = this.generateId();
    this.sessionId = driver.sessionId;

    // Create EventBus
    this.eventBus = new AgentEventBus();

    // Create ReactorRegistry
    this.registry = new ReactorRegistry(this.eventBus, {
      agentId: this.agentId,
      sessionId: this.sessionId,
      logger: this.logger,
    });

    // Register core Reactors (order matters!)
    this.registry.register(new DriverReactor(driver));
    this.registry.register(new AgentStateMachine());
    this.registry.register(new AgentMessageAssembler());
    this.registry.register(new AgentExchangeTracker());

    // Register user-provided Reactors
    if (config?.reactors) {
      this.registry.registerAll(config.reactors);
    }

    this.logger?.info(`[AgentEngine] Created engine for session ${this.sessionId}`, {
      agentId: this.agentId,
      sessionId: this.sessionId,
      totalReactors: 4 + (config?.reactors?.length || 0),
    });
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
      this.logger?.warn("[AgentEngine] Already initialized", {
        agentId: this.agentId,
      });
      return;
    }

    this.logger?.info("[AgentEngine] Initializing...", {
      agentId: this.agentId,
      sessionId: this.sessionId,
    });

    // Initialize all Reactors via ReactorRegistry
    await this.registry.initialize();

    this.isInitialized = true;

    this.logger?.info("[AgentEngine] Initialized successfully", {
      agentId: this.agentId,
      sessionId: this.sessionId,
      driverSessionId: this.driver.driverSessionId,
    });
  }

  /**
   * Abort current operation
   */
  abort(): void {
    this.logger?.info("[AgentEngine] Aborting current operation", {
      agentId: this.agentId,
    });

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
    this.logger?.info("[AgentEngine] Destroying engine", {
      agentId: this.agentId,
      sessionId: this.sessionId,
    });

    // Destroy all Reactors via ReactorRegistry (reverse order)
    await this.registry.destroy();

    // Close EventBus
    this.eventBus.close();

    this.isInitialized = false;

    this.logger?.info("[AgentEngine] Destroyed successfully", {
      agentId: this.agentId,
    });
  }

  private generateId(): string {
    return `agent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
