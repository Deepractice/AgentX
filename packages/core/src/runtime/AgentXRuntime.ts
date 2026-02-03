/**
 * AgentXRuntimeImpl - Runtime integration implementation
 *
 * Integrates all components to provide agent lifecycle management.
 * Uses Provider dependencies to coordinate Session, Image, Container, etc.
 */

import { createLogger } from "commonxjs/logger";
import type {
  AgentXProvider,
  AgentXRuntime,
  RuntimeAgent,
  CreateAgentOptions,
  AgentEventHandler,
  Subscription,
  AgentLifecycle,
} from "./types";
import type { UserContentPart } from "../agent/types";
import type { BusEvent } from "../event/types";
import type { Driver, DriverConfig } from "../driver/types";

const logger = createLogger("runtime/AgentXRuntime");

/**
 * Internal agent state
 */
interface AgentState {
  agent: RuntimeAgent;
  lifecycle: AgentLifecycle;
  subscriptions: Set<() => void>;
  driver: Driver;
}

/**
 * AgentXRuntimeImpl - Runtime implementation
 */
export class AgentXRuntimeImpl implements AgentXRuntime {
  readonly provider: AgentXProvider;

  private agents = new Map<string, AgentState>();
  private globalSubscriptions = new Set<() => void>();
  private isShutdown = false;

  constructor(provider: AgentXProvider) {
    this.provider = provider;
    this.setupDriverSubscription();
    logger.info("AgentXRuntime initialized");
  }

  /**
   * Setup subscription to driver events
   */
  private setupDriverSubscription(): void {
    // Subscribe to user_message events and forward to driver
    this.provider.eventBus.on("user_message", async (event) => {
      const context = (event as BusEvent & { context?: { agentId?: string } }).context;
      if (!context?.agentId) return;

      const state = this.agents.get(context.agentId);
      if (!state || state.lifecycle !== "running") {
        logger.warn("Received user_message for non-running agent", {
          agentId: context.agentId,
          lifecycle: state?.lifecycle,
        });
        return;
      }

      // Driver will handle the message and emit response events
      logger.debug("Forwarding user_message to driver", { agentId: context.agentId });
    });
  }

  // ==================== Agent Lifecycle ====================

  async createAgent(options: CreateAgentOptions): Promise<RuntimeAgent> {
    if (this.isShutdown) {
      throw new Error("Runtime is shutdown");
    }

    const { imageId } = options;

    // Load image
    const imageRecord = await this.provider.imageRepository.findImageById(imageId);
    if (!imageRecord) {
      throw new Error(`Image not found: ${imageId}`);
    }

    // Generate agent ID
    const agentId = options.agentId ?? this.generateAgentId();

    // Ensure container exists
    const containerExists = await this.provider.containerRepository.containerExists(
      imageRecord.containerId
    );
    if (!containerExists) {
      throw new Error(`Container not found: ${imageRecord.containerId}`);
    }

    // Create workspace
    const workspace = await this.provider.workspaceProvider.create({
      containerId: imageRecord.containerId,
      imageId,
    });
    await workspace.initialize();

    // Create driver for this agent
    const driverConfig: DriverConfig = {
      apiKey: process.env.ANTHROPIC_API_KEY ?? "",
      baseUrl: process.env.ANTHROPIC_BASE_URL,
      systemPrompt: imageRecord.systemPrompt,
      cwd: workspace.path,
      mcpServers: imageRecord.mcpServers,
    };

    const driver = this.provider.driverFactory.createDriver({
      agentId,
      config: driverConfig,
      resumeSessionId: imageRecord.metadata?.claudeSdkSessionId,
      onSessionIdCaptured: async (claudeSdkSessionId) => {
        // Persist SDK session ID for resume
        await this.provider.imageRepository.updateMetadata(imageId, { claudeSdkSessionId });
      },
    });

    // Connect driver to EventBus
    driver.connect(this.provider.eventBus.asConsumer(), this.provider.eventBus.asProducer());

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
    };
    this.agents.set(agentId, state);

    // Emit agent_created event
    this.provider.eventBus.emit({
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
    this.provider.eventBus.emit({
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
    this.provider.eventBus.emit({
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

    // Disconnect and dispose driver
    state.driver.disconnect();
    state.driver.dispose();

    // Cleanup subscriptions
    for (const unsub of state.subscriptions) {
      unsub();
    }
    state.subscriptions.clear();

    state.lifecycle = "destroyed";

    // Emit agent_destroyed event
    this.provider.eventBus.emit({
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

    const actualRequestId = requestId ?? this.generateRequestId();

    // Build user message
    const userMessage = {
      id: this.generateMessageId(),
      role: "user" as const,
      subtype: "user" as const,
      content,
      timestamp: Date.now(),
    };

    // Persist to session
    await this.provider.sessionRepository.addMessage(state.agent.sessionId, userMessage);

    // Emit user_message event to trigger driver
    this.provider.eventBus.emit({
      type: "user_message",
      timestamp: Date.now(),
      source: "runtime",
      category: "message",
      intent: "request",
      requestId: actualRequestId,
      data: userMessage,
      context: {
        agentId,
        imageId: state.agent.imageId,
        containerId: state.agent.containerId,
        sessionId: state.agent.sessionId,
      },
    } as BusEvent);

    logger.debug("User message sent", {
      agentId,
      requestId: actualRequestId,
      contentPreview:
        typeof content === "string" ? content.substring(0, 50) : `[${content.length} parts]`,
    });
  }

  interrupt(agentId: string, requestId?: string): void {
    const state = this.agents.get(agentId);
    if (!state) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Emit interrupt event
    this.provider.eventBus.emit({
      type: "interrupt",
      timestamp: Date.now(),
      source: "runtime",
      category: "action",
      intent: "request",
      requestId,
      data: { agentId },
      context: {
        agentId,
        imageId: state.agent.imageId,
        containerId: state.agent.containerId,
        sessionId: state.agent.sessionId,
      },
    } as BusEvent);

    logger.debug("Interrupt sent", { agentId, requestId });
  }

  // ==================== Event Subscription ====================

  subscribe(agentId: string, handler: AgentEventHandler): Subscription {
    const state = this.agents.get(agentId);
    if (!state) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const unsub = this.provider.eventBus.onAny((event) => {
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
    const unsub = this.provider.eventBus.onAny(handler);
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
 */
export function createAgentXRuntime(provider: AgentXProvider): AgentXRuntime {
  return new AgentXRuntimeImpl(provider);
}
