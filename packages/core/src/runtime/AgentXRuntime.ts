/**
 * AgentXRuntimeImpl - Runtime integration implementation
 *
 * Integrates all components to provide agent lifecycle management.
 * Uses Platform dependencies to coordinate Session, Image, Container, etc.
 *
 * Architecture:
 * - Driver.receive() returns AsyncIterable<DriverStreamEvent>
 * - Runtime emits raw stream events to EventBus
 * - Runtime pushes events through AgentEngine (MealyMachine → Presenter)
 * - Presenter emits message/state/turn events and persists messages
 */

import { createLogger } from "commonxjs/logger";
import { createAgent as createAgentEngine } from "../agent/createAgent";
import type {
  AgentEngine,
  AgentOutput,
  AgentPresenter,
  AgentSource,
  Message,
  StreamEvent,
  UserContentPart,
  UserMessage,
} from "../agent/types";
import { createBashTool } from "../bash/tool";
import type {
  CreateDriver,
  Driver,
  DriverConfig,
  DriverStreamEvent,
  ToolDefinition,
} from "../driver/types";
import { AgentXError } from "../error/AgentXError";
import { CircuitBreaker } from "../error/CircuitBreaker";
import type { BusEvent } from "../event/types";
import { createSession } from "../session/Session";
import type {
  AgentEventHandler,
  AgentLifecycle,
  AgentXPlatform,
  AgentXRuntime,
  CreateAgentOptions,
  RuntimeAgent,
  Subscription,
} from "./types";

const logger = createLogger("runtime/AgentXRuntime");

/**
 * Internal agent state
 */
interface AgentState {
  agent: RuntimeAgent;
  lifecycle: AgentLifecycle;
  subscriptions: Set<() => void>;
  driver: Driver;
  engine: AgentEngine;
  circuitBreaker: CircuitBreaker;
  /** Flag to track if a receive operation is in progress */
  isReceiving: boolean;
  /** Pending message persist promises — flushed at end of receive() */
  pendingPersists: Promise<void>[];
}

/**
 * AgentXRuntimeImpl - Runtime implementation
 */
export class AgentXRuntimeImpl implements AgentXRuntime {
  readonly platform: AgentXPlatform;
  private readonly createDriver: CreateDriver;

  private agents = new Map<string, AgentState>();
  private globalSubscriptions = new Set<() => void>();
  private isShutdown = false;

  constructor(platform: AgentXPlatform, createDriver: CreateDriver) {
    this.platform = platform;
    this.createDriver = createDriver;
    logger.info("AgentXRuntime initialized");
  }

  // ==================== Agent Lifecycle ====================

  async createAgent(options: CreateAgentOptions): Promise<RuntimeAgent> {
    if (this.isShutdown) {
      throw new Error("Runtime is shutdown");
    }

    const { imageId } = options;

    // Load image
    const imageRecord = await this.platform.imageRepository.findImageById(imageId);
    if (!imageRecord) {
      throw new Error(`Image not found: ${imageId}`);
    }

    // Generate instance ID
    const instanceId = options.instanceId ?? this.generateInstanceId();

    // Ensure container exists (auto-create if needed)
    const { getOrCreateContainer } = await import("../container");
    await getOrCreateContainer(imageRecord.containerId, {
      containerRepository: this.platform.containerRepository,
      imageRepository: this.platform.imageRepository,
      sessionRepository: this.platform.sessionRepository,
    });

    // Create Session for driver (MonoDriver needs this to read history)
    const session = createSession({
      sessionId: imageRecord.sessionId,
      imageId,
      containerId: imageRecord.containerId,
      repository: this.platform.sessionRepository,
    });

    // Assemble platform-provided default tools
    const defaultTools: ToolDefinition[] = [];
    if (this.platform.bashProvider) {
      defaultTools.push(createBashTool(this.platform.bashProvider));
    }

    // Create context if Image has a contextId and platform provides a ContextProvider
    let context: import("../context/types").Context | undefined;
    if (imageRecord.contextId && this.platform.contextProvider) {
      context = await this.platform.contextProvider.create(imageRecord.contextId);
      // Merge context capabilities into default tools
      for (const cap of context.capabilities()) {
        if (cap.type === "tool") {
          defaultTools.push({
            name: cap.name,
            description: cap.description,
            parameters: cap.parameters,
            execute: cap.execute,
          });
        }
      }
    }

    // Resolve embodiment
    const embody = imageRecord.embody;
    const systemPrompt = embody?.systemPrompt;
    const mcpServers = embody?.mcpServers;
    const imageModel = embody?.model;

    // Create driver config
    const driverConfig: DriverConfig = {
      apiKey: "",
      instanceId,
      systemPrompt,
      mcpServers,
      context,
      tools: defaultTools.length > 0 ? defaultTools : undefined,
      session, // Inject Session for stateless drivers
      resumeSessionId: imageRecord.metadata?.driverSessionId as string | undefined,
      onSessionIdCaptured: async (driverSessionId: string) => {
        // Persist driver session ID for resume
        await this.platform.imageRepository.updateMetadata(imageId, { driverSessionId });
      },
    };

    // Inject LLM provider config (apiKey, baseUrl, model) from container's default provider
    const defaultProvider = this.platform.llmProviderRepository
      ? await this.platform.llmProviderRepository.findDefaultLLMProvider(imageRecord.containerId)
      : null;

    if (defaultProvider) {
      driverConfig.apiKey = defaultProvider.apiKey;
      if (defaultProvider.baseUrl) {
        driverConfig.baseUrl = defaultProvider.baseUrl;
      }
      if (defaultProvider.model) {
        driverConfig.model = defaultProvider.model;
      }
    }

    // Image-level model overrides container default
    if (imageModel) {
      driverConfig.model = imageModel;
    }

    // Create driver using the injected CreateDriver function
    const driver = this.createDriver(driverConfig);

    // Validate LLM provider protocol against driver's supported protocols
    if (defaultProvider) {
      const supported = driver.supportedProtocols;
      if (!supported.includes(defaultProvider.protocol)) {
        throw new Error(
          `Protocol mismatch: LLM provider "${defaultProvider.name}" uses protocol "${defaultProvider.protocol}", ` +
            `but driver "${driver.name}" only supports [${supported.join(", ")}]`
        );
      }
    }

    // Initialize driver
    await driver.initialize();

    // Create AgentEngine with custom Source and Presenter
    // Source: no-op (Runtime pushes events directly via handleStreamEvent)
    // Presenter: emits message/state/turn events to EventBus + persists messages
    const noopSource: AgentSource = {
      name: "RuntimeSource",
      connect: () => {},
      disconnect: () => {},
    };

    const sessionId = imageRecord.sessionId;
    const sessionRepository = this.platform.sessionRepository;
    const eventBus = this.platform.eventBus;

    const runtimePresenter: AgentPresenter = {
      name: "RuntimePresenter",
      present: (_instanceId: string, output: AgentOutput) => {
        const category = categorizeAgentOutput(output.type);

        // Skip stream events — already emitted by handleDriverEvent
        if (category === "stream") return;

        // Emit state/message/turn events to EventBus
        eventBus.emit({
          type: output.type,
          timestamp: output.timestamp,
          source: "agent",
          category,
          intent: "notification",
          data: output.data,
          context: {
            instanceId,
            imageId,
            containerId: imageRecord.containerId,
            sessionId,
          },
        } as BusEvent);

        // Persist message events to SessionRepository
        // Promises are collected in pendingPersists and flushed at end of receive()
        if (category === "message" && output.type !== "user_message") {
          const message = output.data as Message;
          const persistPromise = sessionRepository.addMessage(sessionId, message).catch((err) => {
            const axError = new AgentXError({
              code: "PERSISTENCE_FAILED",
              category: "persistence",
              message: `Failed to persist ${output.type}`,
              recoverable: true,
              context: { instanceId, sessionId, imageId, containerId: imageRecord.containerId },
              cause: err instanceof Error ? err : new Error(String(err)),
            });
            logger.error("Failed to persist message", { type: output.type, error: err });
            eventBus.emit({
              type: "agentx_error",
              timestamp: Date.now(),
              source: "runtime",
              category: "error",
              intent: "notification",
              data: axError,
              context: { instanceId, sessionId, imageId, containerId: imageRecord.containerId },
            } as BusEvent);
          });
          const agentState = this.agents.get(instanceId);
          if (agentState) {
            agentState.pendingPersists.push(persistPromise);
          }
        }
      },
    };

    const engine = createAgentEngine({
      instanceId,
      bus: this.platform.eventBus,
      source: noopSource,
      presenter: runtimePresenter,
    });

    // Create runtime agent
    const agent: RuntimeAgent = {
      instanceId,
      imageId,
      containerId: imageRecord.containerId,
      sessionId: imageRecord.sessionId,
      name: imageRecord.name,
      lifecycle: "running",
      createdAt: Date.now(),
    };

    // Create circuit breaker for this agent's driver calls
    const circuitBreaker = new CircuitBreaker();
    circuitBreaker.onChange((newState, error) => {
      logger.warn("Circuit breaker state changed", { instanceId, state: newState });
      if (error) {
        eventBus.emit({
          type: "agentx_error",
          timestamp: Date.now(),
          source: "runtime",
          category: "error",
          intent: "notification",
          data: error,
          context: { instanceId, imageId, containerId: imageRecord.containerId, sessionId },
        } as BusEvent);
      }
    });

    // Store agent state with driver and engine
    const state: AgentState = {
      agent,
      lifecycle: "running",
      subscriptions: new Set(),
      driver,
      engine,
      circuitBreaker,
      isReceiving: false,
      pendingPersists: [],
    };
    this.agents.set(instanceId, state);

    // Emit agent_created event
    this.platform.eventBus.emit({
      type: "agent_created",
      timestamp: Date.now(),
      source: "runtime",
      category: "lifecycle",
      intent: "notification",
      data: {
        instanceId,
        imageId,
        containerId: imageRecord.containerId,
      },
      context: {
        instanceId,
        imageId,
        containerId: imageRecord.containerId,
        sessionId: imageRecord.sessionId,
      },
    } as BusEvent);

    logger.info("Agent created", {
      instanceId,
      imageId,
      containerId: imageRecord.containerId,
    });

    return agent;
  }

  getAgent(instanceId: string): RuntimeAgent | undefined {
    const state = this.agents.get(instanceId);
    return state?.agent;
  }

  getAgents(): RuntimeAgent[] {
    return Array.from(this.agents.values()).map((s) => s.agent);
  }

  getAgentsByContainer(containerId: string): RuntimeAgent[] {
    return Array.from(this.agents.values())
      .filter((s) => s.agent.containerId === containerId)
      .map((s) => s.agent);
  }

  async stopAgent(instanceId: string): Promise<void> {
    const state = this.agents.get(instanceId);
    if (!state) {
      throw new Error(`Agent not found: ${instanceId}`);
    }

    if (state.lifecycle === "destroyed") {
      throw new Error(`Agent already destroyed: ${instanceId}`);
    }

    state.lifecycle = "stopped";

    // Emit agent_stopped event
    this.platform.eventBus.emit({
      type: "agent_stopped",
      timestamp: Date.now(),
      source: "runtime",
      category: "lifecycle",
      intent: "notification",
      data: { instanceId },
      context: {
        instanceId,
        imageId: state.agent.imageId,
        containerId: state.agent.containerId,
        sessionId: state.agent.sessionId,
      },
    } as BusEvent);

    logger.info("Agent stopped", { instanceId });
  }

  async resumeAgent(instanceId: string): Promise<void> {
    const state = this.agents.get(instanceId);
    if (!state) {
      throw new Error(`Agent not found: ${instanceId}`);
    }

    if (state.lifecycle === "destroyed") {
      throw new Error(`Cannot resume destroyed agent: ${instanceId}`);
    }

    state.lifecycle = "running";

    // Emit agent_resumed event
    this.platform.eventBus.emit({
      type: "agent_resumed",
      timestamp: Date.now(),
      source: "runtime",
      category: "lifecycle",
      intent: "notification",
      data: { instanceId },
      context: {
        instanceId,
        imageId: state.agent.imageId,
        containerId: state.agent.containerId,
        sessionId: state.agent.sessionId,
      },
    } as BusEvent);

    logger.info("Agent resumed", { instanceId });
  }

  async destroyAgent(instanceId: string): Promise<void> {
    const state = this.agents.get(instanceId);
    if (!state) {
      throw new Error(`Agent not found: ${instanceId}`);
    }

    // Dispose driver and engine
    await state.driver.dispose();
    await state.engine.destroy();

    // Cleanup subscriptions
    for (const unsub of state.subscriptions) {
      unsub();
    }
    state.subscriptions.clear();

    state.lifecycle = "destroyed";

    // Emit agent_destroyed event
    this.platform.eventBus.emit({
      type: "agent_destroyed",
      timestamp: Date.now(),
      source: "runtime",
      category: "lifecycle",
      intent: "notification",
      data: { instanceId },
      context: {
        instanceId,
        imageId: state.agent.imageId,
        containerId: state.agent.containerId,
        sessionId: state.agent.sessionId,
      },
    } as BusEvent);

    // Remove from map
    this.agents.delete(instanceId);

    logger.info("Agent destroyed", { instanceId });
  }

  // ==================== Message Handling ====================

  async receive(
    instanceId: string,
    content: string | UserContentPart[],
    requestId?: string
  ): Promise<void> {
    const state = this.agents.get(instanceId);
    if (!state) {
      throw new Error(`Agent not found: ${instanceId}`);
    }

    if (state.lifecycle !== "running") {
      throw new Error(`Cannot send message to ${state.lifecycle} agent: ${instanceId}`);
    }

    if (state.isReceiving) {
      throw new Error(`Agent ${instanceId} is already processing a message`);
    }

    // Circuit breaker check
    if (!state.circuitBreaker.canExecute()) {
      throw new AgentXError({
        code: "CIRCUIT_OPEN",
        category: "driver",
        message: "Circuit breaker open: too many consecutive driver failures",
        recoverable: false,
        context: {
          instanceId,
          sessionId: state.agent.sessionId,
          imageId: state.agent.imageId,
          containerId: state.agent.containerId,
        },
      });
    }

    const actualRequestId = requestId ?? this.generateRequestId();

    // Build user message
    const userMessage: UserMessage = {
      id: this.generateMessageId(),
      role: "user",
      subtype: "user",
      content,
      timestamp: Date.now(),
    };

    // Persist to session
    await this.platform.sessionRepository.addMessage(state.agent.sessionId, userMessage);

    // Emit user_message event (for external subscribers)
    this.emitEvent(state, "user_message", userMessage, actualRequestId);

    logger.debug("User message sent", {
      instanceId,
      requestId: actualRequestId,
      contentPreview:
        typeof content === "string"
          ? content.substring(0, 50)
          : Array.isArray(content)
            ? `[${content.length} parts]`
            : `[${typeof content}]`,
    });

    // Mark as receiving
    state.isReceiving = true;

    try {
      // Call driver.receive() and process the AsyncIterable
      for await (const event of state.driver.receive(userMessage)) {
        // Convert DriverStreamEvent to BusEvent and emit
        this.handleDriverEvent(state, event, actualRequestId);
      }
      // Driver call succeeded — record success for circuit breaker
      state.circuitBreaker.recordSuccess();
    } catch (error) {
      // Record failure for circuit breaker
      state.circuitBreaker.recordFailure(error instanceof Error ? error : undefined);

      // Emit error event
      this.emitEvent(
        state,
        "error_received",
        {
          message: error instanceof Error ? error.message : String(error),
          errorCode: "runtime_error",
        },
        actualRequestId
      );
      throw error;
    } finally {
      // Flush any pending partial content from MealyMachine (e.g. interrupted stream)
      // This produces an assistant_message that gets persisted via the presenter pipeline
      state.engine.flush();

      // Flush all pending message persists before returning
      if (state.pendingPersists.length > 0) {
        await Promise.all(state.pendingPersists);
        state.pendingPersists = [];
      }
      state.isReceiving = false;
    }
  }

  interrupt(instanceId: string, requestId?: string): void {
    const state = this.agents.get(instanceId);
    if (!state) {
      throw new Error(`Agent not found: ${instanceId}`);
    }

    // Call driver.interrupt() directly
    state.driver.interrupt();

    // Emit interrupt event (for external subscribers)
    this.emitEvent(state, "interrupt", { instanceId }, requestId ?? this.generateRequestId());

    logger.debug("Interrupt sent", { instanceId, requestId });
  }

  // ==================== Event Subscription ====================

  subscribe(instanceId: string, handler: AgentEventHandler): Subscription {
    const state = this.agents.get(instanceId);
    if (!state) {
      throw new Error(`Agent not found: ${instanceId}`);
    }

    const unsub = this.platform.eventBus.onAny((event) => {
      const context = (event as BusEvent & { context?: { instanceId?: string } }).context;
      if (context?.instanceId === instanceId) {
        handler(event);
      }
    });

    state.subscriptions.add(unsub);

    return {
      unsubscribe: () => {
        unsub();
        state.subscriptions.delete(unsub);
      },
    };
  }

  subscribeAll(handler: AgentEventHandler): Subscription {
    const unsub = this.platform.eventBus.onAny(handler);
    this.globalSubscriptions.add(unsub);

    return {
      unsubscribe: () => {
        unsub();
        this.globalSubscriptions.delete(unsub);
      },
    };
  }

  // ==================== Cleanup ====================

  async shutdown(): Promise<void> {
    if (this.isShutdown) return;

    logger.info("Shutting down AgentXRuntime...");

    // Destroy all agents
    const instanceIds = Array.from(this.agents.keys());
    for (const instanceId of instanceIds) {
      await this.destroyAgent(instanceId);
    }

    // Cleanup global subscriptions
    for (const unsub of this.globalSubscriptions) {
      unsub();
    }
    this.globalSubscriptions.clear();

    this.isShutdown = true;
    logger.info("AgentXRuntime shutdown complete");
  }

  // ==================== Private Helpers ====================

  /**
   * Handle a single DriverStreamEvent
   */
  private handleDriverEvent(state: AgentState, event: DriverStreamEvent, requestId: string): void {
    // 1. Emit raw stream event to EventBus (for Presentation and other subscribers)
    this.emitEvent(state, event.type, event.data, requestId);

    // 2. Push to AgentEngine for MealyMachine processing
    //    Engine produces message/state/turn events via Presenter
    const streamEvent = toStreamEvent(event);
    state.engine.handleStreamEvent(streamEvent);
  }

  /**
   * Emit an event to the EventBus
   */
  private emitEvent(state: AgentState, type: string, data: unknown, requestId: string): void {
    this.platform.eventBus.emit({
      type,
      timestamp: Date.now(),
      source: "runtime",
      category: this.categorizeEvent(type),
      intent: "notification",
      requestId,
      data,
      context: {
        instanceId: state.agent.instanceId,
        imageId: state.agent.imageId,
        containerId: state.agent.containerId,
        sessionId: state.agent.sessionId,
      },
    } as BusEvent);
  }

  /**
   * Categorize event type
   */
  private categorizeEvent(type: string): string {
    if (type.includes("message")) return "message";
    if (type.includes("tool")) return "tool";
    if (type.includes("error") || type.includes("interrupted")) return "error";
    if (type.includes("delta")) return "stream";
    return "stream";
  }

  private generateInstanceId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `inst_${timestamp}_${random}`;
  }

  private generateRequestId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `req_${timestamp}_${random}`;
  }

  private generateMessageId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `msg_${timestamp}_${random}`;
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Convert DriverStreamEvent to agent-layer StreamEvent.
 * Data structures are identical; only "error" type needs renaming.
 */
function toStreamEvent(event: DriverStreamEvent): StreamEvent {
  const type = event.type === "error" ? "error_received" : event.type;
  return { type, data: event.data, timestamp: Date.now() } as StreamEvent;
}

/**
 * Categorize AgentOutput type for EventBus emission.
 */
function categorizeAgentOutput(type: string): string {
  // Stream layer — already emitted by handleDriverEvent
  const streamTypes = [
    "message_start",
    "message_delta",
    "message_stop",
    "text_delta",
    "thinking_delta",
    "tool_use_start",
    "input_json_delta",
    "tool_use_stop",
    "tool_result",
    "error_received",
    "interrupted",
  ];
  if (streamTypes.includes(type)) return "stream";

  // Message layer
  if (type.endsWith("_message")) return "message";

  // Turn layer
  if (type.startsWith("turn_")) return "turn";

  // State layer (default)
  return "state";
}

/**
 * Create an AgentXRuntime instance
 *
 * @param platform - AgentXPlatform with repositories and event bus
 * @param createDriver - Factory function for creating Driver instances per Agent
 */
export function createAgentXRuntime(
  platform: AgentXPlatform,
  createDriver: CreateDriver
): AgentXRuntime {
  return new AgentXRuntimeImpl(platform, createDriver);
}
