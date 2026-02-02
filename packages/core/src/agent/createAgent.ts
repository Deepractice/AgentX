/**
 * createAgent - Factory function to create an AgentEngine
 *
 * Creates an AgentEngine connected to EventBus:
 * - receive() emits user_message to EventBus
 * - Source subscribes to StreamEvent from EventBus
 * - Presenter emits AgentOutput to EventBus
 *
 * ```
 *                         EventBus
 *                        ↗        ↘
 *         emit          │          │     emit
 *         user_message  │          │     AgentOutput
 *              ↑        │          │      ↑
 * ┌─────────────────────────────────────────────────────────────┐
 * │                       AgentEngine                            │
 * │                                                             │
 * │   receive() ──► Source ──► MealyMachine ──► Presenter       │
 * │                 (sub)                        (pub)          │
 * └─────────────────────────────────────────────────────────────┘
 * ```
 */

import type {
  AgentEngine,
  AgentState,
  AgentOutputCallback,
  UserMessage,
  MessageQueue,
  StateChangeHandler,
  EventHandlerMap,
  ReactHandlerMap,
  AgentOutput,
  CreateAgentOptions,
  AgentSource,
  AgentPresenter,
  AgentEventBus,
  StreamEvent,
  Unsubscribe,
  AgentMiddleware,
  AgentInterceptor,
} from "./types";
import { MealyMachine } from "./engine/MealyMachine";
import { AgentStateMachine } from "./AgentStateMachine";
import { createLogger } from "../common";
import { isDriveableEvent } from "../event";

const logger = createLogger("agent/AgentEngine");

/**
 * Generate unique agent ID
 */
function generateAgentId(): string {
  return `agent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * StreamEvent types that Source should subscribe to
 */
const STREAM_EVENT_TYPES = [
  "message_start",
  "message_delta",
  "message_stop",
  "text_delta",
  "tool_use_start",
  "input_json_delta",
  "tool_use_stop",
  "tool_result",
  "error_received",
];

/**
 * Default Source implementation
 * Subscribes to StreamEvent from EventBus
 */
class DefaultSource implements AgentSource {
  readonly name = "DefaultSource";
  private unsubscribes: Unsubscribe[] = [];

  constructor(
    private readonly bus: AgentEventBus,
    private readonly agentId: string
  ) {}

  connect(onEvent: (event: StreamEvent) => void): void {
    // Subscribe to each StreamEvent type
    for (const type of STREAM_EVENT_TYPES) {
      const unsub = this.bus.on(type, (event: unknown) => {
        // Only process DriveableEvents (source: "driver", category: "stream")
        // This prevents circular processing of AgentOutput events
        if (!isDriveableEvent(event as { source?: string; category?: string })) {
          return;
        }

        // Filter by agentId if present in context
        const e = event as { context?: { agentId?: string } };
        if (e.context?.agentId && e.context.agentId !== this.agentId) {
          return;
        }
        onEvent(event as StreamEvent);
      });
      this.unsubscribes.push(unsub);
    }

    logger.debug("DefaultSource connected", { agentId: this.agentId });
  }

  disconnect(): void {
    for (const unsub of this.unsubscribes) {
      unsub();
    }
    this.unsubscribes = [];
    logger.debug("DefaultSource disconnected", { agentId: this.agentId });
  }
}

/**
 * Default Presenter implementation
 * Emits AgentOutput to EventBus
 */
class DefaultPresenter implements AgentPresenter {
  readonly name = "DefaultPresenter";

  constructor(private readonly bus: AgentEventBus) {}

  present(agentId: string, output: AgentOutput): void {
    // Emit to EventBus with agent context
    this.bus.emit({
      ...output,
      source: "agent",
      context: { agentId },
    });
  }
}

/**
 * Simple MessageQueue implementation
 */
class SimpleMessageQueue implements MessageQueue {
  private queue: UserMessage[] = [];

  get length(): number {
    return this.queue.length;
  }

  get isEmpty(): boolean {
    return this.queue.length === 0;
  }

  enqueue(message: UserMessage): void {
    this.queue.push(message);
  }

  dequeue(): UserMessage | undefined {
    return this.queue.shift();
  }

  clear(): void {
    this.queue = [];
  }
}

/**
 * AgentEngineImpl - EventBus-based AgentEngine implementation
 */
class AgentEngineImpl implements AgentEngine {
  readonly agentId: string;
  readonly createdAt: number;
  readonly messageQueue: MessageQueue;

  private readonly _messageQueue = new SimpleMessageQueue();
  private readonly bus: AgentEventBus;
  private readonly source: AgentSource;
  private readonly presenter: AgentPresenter;
  private readonly machine: MealyMachine;
  private readonly stateMachine: AgentStateMachine;

  private readonly handlers: Set<AgentOutputCallback> = new Set();
  private readonly typeHandlers: Map<string, Set<AgentOutputCallback>> = new Map();
  private readonly readyHandlers: Set<() => void> = new Set();
  private readonly destroyHandlers: Set<() => void> = new Set();
  private readonly middlewares: AgentMiddleware[] = [];
  private readonly interceptors: AgentInterceptor[] = [];

  private isDestroyed = false;

  constructor(options: CreateAgentOptions) {
    this.agentId = options.agentId ?? generateAgentId();
    this.createdAt = Date.now();
    this.messageQueue = this._messageQueue;
    this.bus = options.bus;
    this.machine = new MealyMachine();
    this.stateMachine = new AgentStateMachine();

    // Use provided Source/Presenter or create defaults
    this.source = options.source ?? new DefaultSource(this.bus, this.agentId);
    this.presenter = options.presenter ?? new DefaultPresenter(this.bus);

    // Connect Source to receive StreamEvents
    this.source.connect((event) => this.handleStreamEvent(event));

    logger.debug("AgentEngine created", { agentId: this.agentId });
  }

  get state(): AgentState {
    return this.stateMachine.state;
  }

  async receive(message: string | UserMessage): Promise<void> {
    if (this.isDestroyed) {
      throw new Error("Cannot receive message on destroyed agent");
    }

    const userMessage: UserMessage =
      typeof message === "string"
        ? {
            id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            role: "user",
            subtype: "user",
            content: message,
            timestamp: Date.now(),
          }
        : message;

    logger.debug("Receiving message", { messageId: userMessage.id });

    // Run through middleware chain
    let processedMessage = userMessage;
    for (const middleware of this.middlewares) {
      let nextCalled = false;
      await middleware(processedMessage, async (msg) => {
        nextCalled = true;
        processedMessage = msg;
      });
      if (!nextCalled) {
        logger.debug("Middleware blocked message", { messageId: userMessage.id });
        return;
      }
    }

    // Emit user_message to EventBus
    // This triggers Driver to send to LLM
    this.bus.emit({
      type: "user_message",
      timestamp: Date.now(),
      source: "agent",
      data: processedMessage,
      context: { agentId: this.agentId },
    });

    logger.debug("user_message emitted to EventBus", { messageId: userMessage.id });
  }

  /**
   * Handle a stream event (called by Source)
   */
  handleStreamEvent(event: StreamEvent): void {
    if (this.isDestroyed) return;

    logger.debug("handleStreamEvent", { type: event.type });

    // Process through MealyMachine
    const outputs = this.machine.process(this.agentId, event);

    logger.debug("MealyMachine outputs", {
      count: outputs.length,
      types: outputs.map((o) => o.type),
    });

    // Emit all outputs
    for (const output of outputs) {
      this.stateMachine.process(output);
      this.emitOutput(output);
    }
  }

  private emitOutput(output: AgentOutput): void {
    // Run through interceptor chain
    let currentOutput: AgentOutput | null = output;

    const runInterceptor = (index: number, out: AgentOutput): void => {
      if (index >= this.interceptors.length) {
        currentOutput = out;
        return;
      }
      this.interceptors[index](out, (nextOut) => {
        runInterceptor(index + 1, nextOut);
      });
    };

    runInterceptor(0, output);
    if (!currentOutput) return;

    // Send to presenter (emits to EventBus)
    this.presenter.present(this.agentId, currentOutput);

    // Notify local handlers
    for (const handler of this.handlers) {
      try {
        handler(currentOutput);
      } catch (e) {
        logger.error("Event handler error", { error: e });
      }
    }

    // Notify type-specific handlers
    const typeSet = this.typeHandlers.get(currentOutput.type);
    if (typeSet) {
      for (const handler of typeSet) {
        try {
          handler(currentOutput);
        } catch (e) {
          logger.error("Event handler error", { error: e });
        }
      }
    }
  }

  on(handler: AgentOutputCallback): Unsubscribe;
  on(handlers: EventHandlerMap): Unsubscribe;
  on(type: string, handler: AgentOutputCallback): Unsubscribe;
  on(types: string[], handler: AgentOutputCallback): Unsubscribe;
  on(
    typeOrHandler: string | string[] | AgentOutputCallback | EventHandlerMap,
    handler?: AgentOutputCallback
  ): Unsubscribe {
    if (typeof typeOrHandler === "function") {
      this.handlers.add(typeOrHandler);
      return () => this.handlers.delete(typeOrHandler);
    }

    if (typeof typeOrHandler === "object" && !Array.isArray(typeOrHandler)) {
      const unsubscribes: Unsubscribe[] = [];
      for (const [type, h] of Object.entries(typeOrHandler)) {
        if (h) {
          unsubscribes.push(this.on(type, h));
        }
      }
      return () => unsubscribes.forEach((u) => u());
    }

    const types = Array.isArray(typeOrHandler) ? typeOrHandler : [typeOrHandler];
    const h = handler!;

    for (const type of types) {
      if (!this.typeHandlers.has(type)) {
        this.typeHandlers.set(type, new Set());
      }
      this.typeHandlers.get(type)!.add(h);
    }

    return () => {
      for (const type of types) {
        this.typeHandlers.get(type)?.delete(h);
      }
    };
  }

  onStateChange(handler: StateChangeHandler): Unsubscribe {
    return this.stateMachine.onStateChange(handler);
  }

  react(handlers: ReactHandlerMap): Unsubscribe {
    const eventHandlerMap: EventHandlerMap = {};
    for (const [key, handler] of Object.entries(handlers)) {
      if (handler && key.startsWith("on")) {
        const eventType = key
          .slice(2)
          .replace(/([A-Z])/g, "_$1")
          .toLowerCase()
          .slice(1);
        eventHandlerMap[eventType] = handler;
      }
    }
    return this.on(eventHandlerMap);
  }

  onReady(handler: () => void): Unsubscribe {
    try {
      handler();
    } catch (e) {
      logger.error("onReady handler error", { error: e });
    }
    this.readyHandlers.add(handler);
    return () => this.readyHandlers.delete(handler);
  }

  onDestroy(handler: () => void): Unsubscribe {
    this.destroyHandlers.add(handler);
    return () => this.destroyHandlers.delete(handler);
  }

  use(middleware: AgentMiddleware): Unsubscribe {
    this.middlewares.push(middleware);
    return () => {
      const index = this.middlewares.indexOf(middleware);
      if (index >= 0) {
        this.middlewares.splice(index, 1);
      }
    };
  }

  intercept(interceptor: AgentInterceptor): Unsubscribe {
    this.interceptors.push(interceptor);
    return () => {
      const index = this.interceptors.indexOf(interceptor);
      if (index >= 0) {
        this.interceptors.splice(index, 1);
      }
    };
  }

  interrupt(): void {
    if (this.state === "idle" || this.isDestroyed) {
      return;
    }

    // Emit interrupt event to EventBus
    this.bus.emit({
      type: "interrupt_request",
      timestamp: Date.now(),
      source: "agent",
      data: {},
      context: { agentId: this.agentId },
    });

    logger.debug("Interrupt requested", { agentId: this.agentId });
  }

  async destroy(): Promise<void> {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    // Disconnect Source
    this.source.disconnect();

    // Notify destroy handlers
    for (const handler of this.destroyHandlers) {
      try {
        handler();
      } catch (e) {
        logger.error("onDestroy handler error", { error: e });
      }
    }

    // Clear state
    this.machine.clearState(this.agentId);
    this.stateMachine.reset();

    this._messageQueue.clear();
    this.handlers.clear();
    this.typeHandlers.clear();
    this.readyHandlers.clear();
    this.destroyHandlers.clear();
    this.middlewares.length = 0;
    this.interceptors.length = 0;

    logger.debug("AgentEngine destroyed", { agentId: this.agentId });
  }
}

/**
 * Create an AgentEngine instance connected to EventBus
 */
export function createAgent(options: CreateAgentOptions): AgentEngine {
  return new AgentEngineImpl(options);
}
