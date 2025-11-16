/**
 * AgentService
 *
 * User-facing API facade for Agent functionality.
 * Provides a simple, reactive interface while hiding internal complexity.
 *
 * Responsibilities:
 * 1. Provide simple public API (send, react, clear, destroy)
 * 2. Manage message history
 * 3. Delegate to AgentRuntime for orchestration
 * 4. Support dynamic Reactor injection
 *
 * Architecture:
 * ```
 * User Code
 *     ↓
 * AgentService (this class - simple API)
 *     ↓
 * AgentRuntime (orchestration + auto-bind reactors)
 *     ↓
 * EventBus + 4-layer pipeline
 * ```
 *
 * Example:
 * ```typescript
 * const driver = new ClaudeDriver(config);
 * const agent = new AgentService(driver);
 *
 * await agent.initialize();
 *
 * // Use Partial Reactor (only implement handlers you need)
 * agent.react({
 *   onAssistantMessage(event) {
 *     console.log("Assistant:", event.data.content);
 *   },
 * });
 *
 * await agent.send("Hello!");
 *
 * await agent.destroy();
 * ```
 */

import { AgentRuntime, type RuntimeConfig } from "./AgentRuntime";
import type { AgentDriver } from "./AgentDriver";
import type { LoggerProvider } from "./LoggerProvider";
import type { Reactor } from "./AgentReactors";
import type { Message, UserMessage } from "@deepractice-ai/agentx-types";
import type {
  UserMessageEvent,
  AssistantMessageEvent,
  EventConsumer,
  Unsubscribe,
} from "@deepractice-ai/agentx-event";

/**
 * AgentService
 *
 * Simple, user-friendly API for Agent interactions.
 */
export class AgentService {
  readonly id: string;
  readonly sessionId: string;

  // Core runtime
  private runtime: AgentRuntime;
  private logger?: LoggerProvider;

  // Message history
  private _messages: Message[] = [];

  // Event consumer for message tracking and dynamic reactors
  private consumer: EventConsumer | null = null;
  private reactorUnsubscribers: Unsubscribe[] = [];

  constructor(driver: AgentDriver, logger?: LoggerProvider, config?: RuntimeConfig) {
    this.runtime = new AgentRuntime(driver, logger, config);
    this.logger = logger;
    this.id = this.runtime.agentId;
    this.sessionId = this.runtime.sessionId;
  }

  /**
   * Initialize agent and start event pipeline
   */
  async initialize(): Promise<void> {
    await this.runtime.initialize();

    // Create consumer for user event subscriptions
    this.consumer = this.runtime.eventBus.createConsumer();

    // Subscribe to message events to maintain history
    this.subscribeToMessageEvents();

    this.logger?.info("[AgentService] Agent initialized and ready", {
      agentId: this.id,
      sessionId: this.sessionId,
    });
  }

  /**
   * Get message history
   */
  get messages(): ReadonlyArray<Message> {
    return this._messages;
  }

  /**
   * Send a message to the agent
   */
  async send(message: string): Promise<void> {
    if (!this.consumer) {
      throw new Error("[AgentService] Agent not initialized. Call initialize() first.");
    }

    this.logger?.debug("[AgentService] Sending user message", {
      agentId: this.id,
      messageLength: message.length,
    });

    // Create UserMessage
    const userMessage: UserMessage = {
      id: this.generateId(),
      role: "user",
      content: message,
      timestamp: Date.now(),
    };

    // Add to history
    this._messages.push(userMessage);

    // Create UserMessageEvent and emit to EventBus
    const userEvent: UserMessageEvent = {
      type: "user_message",
      uuid: this.generateId(),
      agentId: this.id,
      timestamp: Date.now(),
      data: userMessage,
    };

    const producer = this.runtime.eventBus.createProducer();
    producer.produce(userEvent);

    this.logger?.debug("[AgentService] User message emitted", {
      agentId: this.id,
      eventUuid: userEvent.uuid,
    });
  }

  /**
   * Inject a Reactor to handle events
   *
   * Supports Partial Reactors - you only need to implement the handlers you care about.
   * The reactor will be automatically bound to the corresponding event types.
   *
   * Method naming convention:
   * - onTextDelta → subscribes to "text_delta" event
   * - onMessageStop → subscribes to "message_stop" event
   * - onUserMessage → subscribes to "user_message" event
   * - onAssistantMessage → subscribes to "assistant_message" event
   *
   * @param reactor - A Reactor object (or Partial Reactor)
   * @returns Unsubscribe function to remove this reactor
   *
   * @example
   * ```typescript
   * // Partial MessageReactor
   * agent.react({
   *   onAssistantMessage(event) {
   *     console.log("Assistant:", event.data.content);
   *   },
   * });
   *
   * // Full MessageReactor
   * class ChatUI implements MessageReactor {
   *   onUserMessage(event) { ... }
   *   onAssistantMessage(event) { ... }
   * }
   *
   * agent.react(new ChatUI());
   * ```
   */
  react(reactor: Reactor): () => void {
    if (!this.consumer) {
      throw new Error("[AgentService] Agent not initialized. Call initialize() first.");
    }

    // Bind the reactor using the same mechanism as AgentRuntime
    const unsubscribe = this.bindReactor(this.consumer, reactor);
    this.reactorUnsubscribers.push(unsubscribe);

    this.logger?.debug("[AgentService] Reactor injected", {
      agentId: this.id,
      reactorType: reactor.constructor?.name || "Anonymous",
      totalReactors: this.reactorUnsubscribers.length,
    });

    return unsubscribe;
  }

  /**
   * Clear message history and abort current operation
   */
  clear(): void {
    this.logger?.info("[AgentService] Clearing messages and aborting", {
      agentId: this.id,
      clearedMessages: this._messages.length,
    });

    this._messages = [];
    this.runtime.abort();
  }

  /**
   * Destroy agent and clean up all resources
   */
  async destroy(): Promise<void> {
    this.logger?.info("[AgentService] Destroying agent", {
      agentId: this.id,
      sessionId: this.sessionId,
    });

    // Clear message history
    this._messages = [];

    // Unbind all reactors
    this.reactorUnsubscribers.forEach((unsub) => unsub());
    this.reactorUnsubscribers = [];

    // Destroy runtime
    await this.runtime.destroy();

    this.consumer = null;

    this.logger?.info("[AgentService] Agent destroyed", {
      agentId: this.id,
    });
  }

  /**
   * Bind a single reactor to EventConsumer
   *
   * Uses the same auto-discovery mechanism as AgentRuntime.
   * Discovers all handler methods (starting with "on") and binds them
   * to corresponding event types.
   *
   * @private
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

      this.logger?.debug("[AgentService] Reactor method bound", {
        agentId: this.id,
        methodName,
        eventType,
      });
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
   *
   * @private
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

  /**
   * Subscribe to message events to maintain history
   */
  private subscribeToMessageEvents(): void {
    if (!this.consumer) return;

    // Subscribe to AssistantMessageEvent
    const unsubAssistant = this.consumer.consumeByType(
      "assistant_message",
      (event: AssistantMessageEvent) => {
        this._messages.push(event.data);

        this.logger?.debug("[AgentService] Assistant message added to history", {
          agentId: this.id,
          messageId: event.data.id,
          historyLength: this._messages.length,
        });
      }
    );

    this.reactorUnsubscribers.push(unsubAssistant);
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
