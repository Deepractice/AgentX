/**
 * AgentRuntime
 *
 * Runtime orchestration layer that manages all core components.
 *
 * Responsibilities:
 * 1. Create and manage EventBus
 * 2. Connect Driver to EventBus
 * 3. Create and manage the 4-layer event generation pipeline:
 *    - Driver → Stream Events
 *    - StateMachine → State Events
 *    - MessageAssembler → Message Events
 *    - ExchangeTracker → Exchange Events
 * 4. Lifecycle management (initialize, destroy)
 *
 * Architecture:
 * ```
 * AgentRuntime
 *   ├── EventBus (communication backbone)
 *   ├── Driver (transforms external → Stream events)
 *   ├── StateMachine (Stream → State events)
 *   ├── MessageAssembler (Stream → Message events)
 *   └── ExchangeTracker (Message → Exchange events)
 * ```
 *
 * Example:
 * ```typescript
 * const driver = new ClaudeDriver(config);
 * const runtime = new AgentRuntime(driver);
 *
 * await runtime.initialize();
 *
 * // Now EventBus is ready with all 4 layers active
 * const consumer = runtime.eventBus.createConsumer();
 * consumer.consumeByType("assistant_message", handleMessage);
 *
 * await runtime.destroy();
 * ```
 */

import { AgentEventBus } from "./AgentEventBus";
import { AgentStateMachine } from "./AgentStateMachine";
import { AgentMessageAssembler } from "./AgentMessageAssembler";
import { AgentExchangeTracker } from "./AgentExchangeTracker";
import type { AgentDriver } from "./AgentDriver";
import type { LoggerProvider } from "./LoggerProvider";
import type { Reactor } from "./AgentReactors";
import type { EventConsumer, Unsubscribe } from "@deepractice-ai/agentx-event";

/**
 * Runtime configuration
 */
export interface RuntimeConfig {
  /**
   * Reactors to auto-bind on initialization
   */
  reactors?: Reactor[];
}

/**
 * AgentRuntime
 *
 * Orchestrates all core components and manages the event pipeline.
 */
export class AgentRuntime {
  readonly agentId: string;
  readonly sessionId: string;

  // Core components
  readonly eventBus: AgentEventBus;
  private readonly driver: AgentDriver;
  private readonly logger?: LoggerProvider;
  private readonly config?: RuntimeConfig;

  // Event generation pipeline (4 layers)
  private stateMachine: AgentStateMachine | null = null;
  private messageAssembler: AgentMessageAssembler | null = null;
  private exchangeTracker: AgentExchangeTracker | null = null;

  // Reactor bindings
  private reactorUnsubscribers: Unsubscribe[] = [];

  private isInitialized = false;

  constructor(driver: AgentDriver, logger?: LoggerProvider, config?: RuntimeConfig) {
    this.driver = driver;
    this.logger = logger;
    this.config = config;
    this.agentId = this.generateId();
    this.sessionId = driver.sessionId;

    // Create EventBus
    this.eventBus = new AgentEventBus();

    this.logger?.info(`[AgentRuntime] Created runtime for session ${this.sessionId}`, {
      agentId: this.agentId,
      sessionId: this.sessionId,
    });
  }

  /**
   * Initialize runtime and start event pipeline
   *
   * Steps:
   * 1. Connect Driver to EventBus
   * 2. Create and activate 4-layer event generation pipeline
   * 3. Auto-bind reactors
   * 4. Mark as initialized
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger?.warn("[AgentRuntime] Already initialized", {
        agentId: this.agentId,
      });
      return;
    }

    this.logger?.info("[AgentRuntime] Initializing...", {
      agentId: this.agentId,
      sessionId: this.sessionId,
    });

    // Step 1: Connect Driver to EventBus
    // Driver will subscribe to outbound and emit Stream events
    await this.driver.connect(this.eventBus);

    // Step 2: Create 4-layer event generation pipeline
    this.stateMachine = new AgentStateMachine(this.agentId, this.eventBus);
    this.messageAssembler = new AgentMessageAssembler(this.agentId, this.eventBus);
    this.exchangeTracker = new AgentExchangeTracker(this.agentId, this.eventBus);

    // Step 3: Auto-bind reactors
    if (this.config?.reactors) {
      this.bindReactors(this.config.reactors);
    }

    this.isInitialized = true;

    this.logger?.info("[AgentRuntime] Initialized successfully", {
      agentId: this.agentId,
      sessionId: this.sessionId,
      driverSessionId: this.driver.driverSessionId,
      reactorsCount: this.config?.reactors?.length || 0,
    });
  }

  /**
   * Abort current operation
   */
  abort(): void {
    this.logger?.info("[AgentRuntime] Aborting current operation", {
      agentId: this.agentId,
    });

    this.driver.abort();
  }

  /**
   * Destroy runtime and clean up all resources
   */
  async destroy(): Promise<void> {
    this.logger?.info("[AgentRuntime] Destroying runtime", {
      agentId: this.agentId,
      sessionId: this.sessionId,
    });

    // Unbind all reactors
    this.reactorUnsubscribers.forEach((unsub) => unsub());
    this.reactorUnsubscribers = [];

    // Destroy 4-layer pipeline (reverse order)
    if (this.exchangeTracker) {
      this.exchangeTracker.destroy();
      this.exchangeTracker = null;
    }

    if (this.messageAssembler) {
      this.messageAssembler.destroy();
      this.messageAssembler = null;
    }

    if (this.stateMachine) {
      this.stateMachine.destroy();
      this.stateMachine = null;
    }

    // Destroy driver
    await this.driver.destroy();

    // Close EventBus
    this.eventBus.close();

    this.isInitialized = false;

    this.logger?.info("[AgentRuntime] Destroyed successfully", {
      agentId: this.agentId,
    });
  }

  /**
   * Bind multiple reactors
   */
  private bindReactors(reactors: Reactor[]): void {
    const consumer = this.eventBus.createConsumer();

    reactors.forEach((reactor, index) => {
      const unsubscribe = this.bindReactor(consumer, reactor);
      this.reactorUnsubscribers.push(unsubscribe);

      this.logger?.debug("[AgentRuntime] Reactor bound", {
        agentId: this.agentId,
        reactorIndex: index,
        reactorType: reactor.constructor?.name || "Anonymous",
      });
    });
  }

  /**
   * Bind a single reactor to EventConsumer
   *
   * Automatically discovers all handler methods (starting with "on")
   * and binds them to corresponding event types.
   *
   * Method naming convention:
   * - onTextDelta → subscribes to "text_delta" event
   * - onMessageStop → subscribes to "message_stop" event
   * - onUserMessage → subscribes to "user_message" event
   */
  private bindReactor(consumer: EventConsumer, reactor: Reactor): Unsubscribe {
    const unsubscribers: Unsubscribe[] = [];

    // Discover all handler methods (methods starting with "on")
    const handlerMethods = Object.keys(reactor).filter(
      (key) => key.startsWith("on") && typeof reactor[key] === "function"
    );

    // Bind each handler method
    for (const methodName of handlerMethods) {
      // Convert method name to event type
      // onTextDelta → text_delta
      // onMessageStop → message_stop
      const eventType = this.methodNameToEventType(methodName);

      // Bind the handler
      const handler = reactor[methodName].bind(reactor);
      const unsubscribe = consumer.consumeByType(eventType as any, handler);
      unsubscribers.push(unsubscribe);
    }

    // Return combined unsubscribe function
    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }

  /**
   * Convert method name to event type
   *
   * Examples:
   * - onTextDelta → text_delta
   * - onMessageStop → message_stop
   * - onUserMessage → user_message
   * - onToolUseContentBlockStart → tool_use_content_block_start
   */
  private methodNameToEventType(methodName: string): string {
    // Remove "on" prefix
    const withoutOn = methodName.slice(2);

    // Convert PascalCase to snake_case
    return withoutOn
      .replace(/([A-Z])/g, "_$1")
      .toLowerCase()
      .slice(1); // Remove leading underscore
  }

  private generateId(): string {
    return `agent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
