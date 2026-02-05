/**
 * AgentXRuntimeImpl - Runtime integration implementation
 *
 * Integrates all components to provide agent lifecycle management.
 * Uses Platform dependencies to coordinate Session, Image, Container, etc.
 *
 * New Design:
 * - Driver.receive() returns AsyncIterable<DriverStreamEvent>
 * - Runtime processes events and emits to EventBus
 * - No more EventBus-based communication with Driver
 */

import { createLogger } from "commonxjs/logger";
import type {
  AgentXPlatform,
  AgentXRuntime,
  RuntimeAgent,
  CreateAgentOptions,
  AgentEventHandler,
  Subscription,
  AgentLifecycle,
} from "./types";
import type { UserContentPart, UserMessage } from "../agent/types";
import type { BusEvent } from "../event/types";
import type { CreateDriver, Driver, DriverConfig, DriverStreamEvent, ToolDefinition } from "../driver/types";
import { createSession } from "../session/Session";
import { createBashTool } from "../bash/tool";

const logger = createLogger("runtime/AgentXRuntime");

/**
 * Internal agent state
 */
interface AgentState {
  agent: RuntimeAgent;
  lifecycle: AgentLifecycle;
  subscriptions: Set<() => void>;
  driver: Driver;
  /** Flag to track if a receive operation is in progress */
  isReceiving: boolean;
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

    // Generate agent ID
    const agentId = options.agentId ?? this.generateAgentId();

    // Ensure container exists
    const containerExists = await this.platform.containerRepository.containerExists(
      imageRecord.containerId
    );
    if (!containerExists) {
      throw new Error(`Container not found: ${imageRecord.containerId}`);
    }

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

    // Create driver config (apiKey/baseUrl are provided by the createDriver closure)
    const driverConfig: DriverConfig = {
      apiKey: "",
      agentId,
      systemPrompt: imageRecord.systemPrompt,
      mcpServers: imageRecord.mcpServers,
      tools: defaultTools.length > 0 ? defaultTools : undefined,
      session, // Inject Session for stateless drivers
      resumeSessionId: imageRecord.metadata?.claudeSdkSessionId as string | undefined,
      onSessionIdCaptured: async (claudeSdkSessionId: string) => {
        // Persist SDK session ID for resume
        await this.platform.imageRepository.updateMetadata(imageId, { claudeSdkSessionId });
      },
    };

    // Create driver using the injected CreateDriver function
    const driver = this.createDriver(driverConfig);

    // Initialize driver
    await driver.initialize();

    // Create runtime agent
    const agent: RuntimeAgent = {
      agentId,
      imageId,
      containerId: imageRecord.containerId,
      sessionId: imageRecord.sessionId,
      name: imageRecord.name,
      lifecycle: "running",
      createdAt: Date.now(),
    };

    // Store agent state with driver
    const state: AgentState = {
      agent,
      lifecycle: "running",
      subscriptions: new Set(),
      driver,
      isReceiving: false,
    };
    this.agents.set(agentId, state);

    // Emit agent_created event
    this.platform.eventBus.emit({
      type: "agent_created",
      timestamp: Date.now(),
      source: "runtime",
      category: "lifecycle",
      intent: "notification",
      data: {
        agentId,
        imageId,
        containerId: imageRecord.containerId,
      },
      context: {
        agentId,
        imageId,
        containerId: imageRecord.containerId,
        sessionId: imageRecord.sessionId,
      },
    } as BusEvent);

    logger.info("Agent created", {
      agentId,
      imageId,
      containerId: imageRecord.containerId,
    });

    return agent;
  }

  getAgent(agentId: string): RuntimeAgent | undefined {
    const state = this.agents.get(agentId);
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

  async stopAgent(agentId: string): Promise<void> {
    const state = this.agents.get(agentId);
    if (!state) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    if (state.lifecycle === "destroyed") {
      throw new Error(`Agent already destroyed: ${agentId}`);
    }

    state.lifecycle = "stopped";

    // Emit agent_stopped event
    this.platform.eventBus.emit({
      type: "agent_stopped",
      timestamp: Date.now(),
      source: "runtime",
      category: "lifecycle",
      intent: "notification",
      data: { agentId },
      context: {
        agentId,
        imageId: state.agent.imageId,
        containerId: state.agent.containerId,
        sessionId: state.agent.sessionId,
      },
    } as BusEvent);

    logger.info("Agent stopped", { agentId });
  }

  async resumeAgent(agentId: string): Promise<void> {
    const state = this.agents.get(agentId);
    if (!state) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    if (state.lifecycle === "destroyed") {
      throw new Error(`Cannot resume destroyed agent: ${agentId}`);
    }

    state.lifecycle = "running";

    // Emit agent_resumed event
    this.platform.eventBus.emit({
      type: "agent_resumed",
      timestamp: Date.now(),
      source: "runtime",
      category: "lifecycle",
      intent: "notification",
      data: { agentId },
      context: {
        agentId,
        imageId: state.agent.imageId,
        containerId: state.agent.containerId,
        sessionId: state.agent.sessionId,
      },
    } as BusEvent);

    logger.info("Agent resumed", { agentId });
  }

  async destroyAgent(agentId: string): Promise<void> {
    const state = this.agents.get(agentId);
    if (!state) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Dispose driver (new interface, no disconnect needed)
    await state.driver.dispose();

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
      data: { agentId },
      context: {
        agentId,
        imageId: state.agent.imageId,
        containerId: state.agent.containerId,
        sessionId: state.agent.sessionId,
      },
    } as BusEvent);

    // Remove from map
    this.agents.delete(agentId);

    logger.info("Agent destroyed", { agentId });
  }

  // ==================== Message Handling ====================

  async receive(
    agentId: string,
    content: string | UserContentPart[],
    requestId?: string
  ): Promise<void> {
    const state = this.agents.get(agentId);
    if (!state) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    if (state.lifecycle !== "running") {
      throw new Error(`Cannot send message to ${state.lifecycle} agent: ${agentId}`);
    }

    if (state.isReceiving) {
      throw new Error(`Agent ${agentId} is already processing a message`);
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
      agentId,
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
    } catch (error) {
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
      state.isReceiving = false;
    }
  }

  interrupt(agentId: string, requestId?: string): void {
    const state = this.agents.get(agentId);
    if (!state) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Call driver.interrupt() directly
    state.driver.interrupt();

    // Emit interrupt event (for external subscribers)
    this.emitEvent(
      state,
      "interrupt",
      { agentId },
      requestId ?? this.generateRequestId()
    );

    logger.debug("Interrupt sent", { agentId, requestId });
  }

  // ==================== Event Subscription ====================

  subscribe(agentId: string, handler: AgentEventHandler): Subscription {
    const state = this.agents.get(agentId);
    if (!state) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const unsub = this.platform.eventBus.onAny((event) => {
      const context = (event as BusEvent & { context?: { agentId?: string } }).context;
      if (context?.agentId === agentId) {
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
    const agentIds = Array.from(this.agents.keys());
    for (const agentId of agentIds) {
      await this.destroyAgent(agentId);
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
  private handleDriverEvent(
    state: AgentState,
    event: DriverStreamEvent,
    requestId: string
  ): void {
    // Map DriverStreamEvent to BusEvent and emit
    this.emitEvent(state, event.type, event.data, requestId);
  }

  /**
   * Emit an event to the EventBus
   */
  private emitEvent(
    state: AgentState,
    type: string,
    data: unknown,
    requestId: string
  ): void {
    this.platform.eventBus.emit({
      type,
      timestamp: Date.now(),
      source: "runtime",
      category: this.categorizeEvent(type),
      intent: "notification",
      requestId,
      data,
      context: {
        agentId: state.agent.agentId,
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

  private generateAgentId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `agent_${timestamp}_${random}`;
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

/**
 * Create an AgentXRuntime instance
 *
 * @param platform - AgentXPlatform with repositories and event bus
 * @param createDriver - Factory function for creating Driver instances per Agent
 */
export function createAgentXRuntime(platform: AgentXPlatform, createDriver: CreateDriver): AgentXRuntime {
  return new AgentXRuntimeImpl(platform, createDriver);
}
