/**
 * RuntimeAgent - Full Agent implementation
 *
 * Combines:
 * - Engine: Event processing (from @agentxjs/agent)
 * - Driver: Bus communication
 * - Sandbox: Workdir, MCP
 * - Session: Message persistence
 */

import type { Agent as RuntimeAgentInterface, AgentLifecycle, AgentConfig, SystemEvent, EventCategory } from "@agentxjs/types/runtime";
import type {
  AgentEngine,
  AgentPresenter,
  AgentOutput,
  Message,
  UserMessage,
  AssistantMessage,
  ToolCallMessage,
  ToolResultMessage,
  ContentPart,
  ToolCallPart,
  ToolResultPart,
} from "@agentxjs/types/agent";
import type { SystemBus, SystemBusProducer, Sandbox, Session } from "@agentxjs/types/runtime/internal";
import { createAgent } from "@agentxjs/agent";
import { createLogger } from "@agentxjs/common";
import { BusDriver } from "./BusDriver";

const logger = createLogger("runtime/RuntimeAgent");

/**
 * RuntimeAgent configuration
 */
export interface RuntimeAgentConfig {
  agentId: string;
  imageId: string;
  containerId: string;
  config: AgentConfig;
  bus: SystemBus;
  sandbox: Sandbox;
  session: Session;
}

/**
 * BusPresenter - Forwards AgentOutput to SystemBus as proper SystemEvent
 *
 * Responsibilities:
 * 1. Filter out Stream layer events (already sent via DriveableEvent)
 * 2. Convert State/Message/Turn layer events to SystemEvent format
 * 3. Transform Message layer data to proper Message type for persistence
 *
 * Event Flow:
 * - Stream layer: SKIP (DriveableEvent already handles this)
 * - State layer: Convert to SystemEvent, emit
 * - Message layer: Convert data to Message type, emit, persist
 * - Turn layer: Convert to SystemEvent, emit
 */
class BusPresenter implements AgentPresenter {
  readonly name = "BusPresenter";
  readonly description = "Forwards AgentOutput to SystemBus and collects messages";

  constructor(
    private readonly producer: SystemBusProducer,
    private readonly session: Session,
    private readonly agentId: string,
    private readonly imageId: string,
    private readonly containerId: string
  ) {}

  present(_agentId: string, output: AgentOutput): void {
    const category = this.getCategoryForOutput(output);

    // Skip Stream layer events - already sent via DriveableEvent from ClaudeReceptor
    if (category === "stream") {
      return;
    }

    // Convert data format based on category
    let data: unknown = output.data;
    if (category === "message") {
      data = this.convertToMessage(output);
    }
    // State and Turn layer data formats match SystemEvent expectations

    // Build complete SystemEvent
    const systemEvent: SystemEvent = {
      type: output.type,
      timestamp: output.timestamp,
      data,
      source: "agent",
      category,
      intent: "notification",
      context: {
        containerId: this.containerId,
        imageId: this.imageId,
        agentId: this.agentId,
        sessionId: this.session.sessionId,
      },
    };

    this.producer.emit(systemEvent);
    logger.debug("Emitted SystemEvent", { type: output.type, category });

    // Persist Message layer events to session
    if (category === "message") {
      this.session.addMessage(data as Message).catch((err) => {
        logger.error("Failed to persist message", { error: err, messageType: output.type });
      });
    }
  }

  /**
   * Convert AgentOutput to proper Message type for persistence
   *
   * Event data format → Message type format:
   * - messageId → id
   * - Add role and subtype fields
   * - Normalize content structure
   */
  private convertToMessage(output: AgentOutput): Message {
    const eventData = output.data as Record<string, unknown>;
    const messageId = eventData.messageId as string;
    const timestamp = (eventData.timestamp as number) || output.timestamp;

    switch (output.type) {
      case "user_message": {
        const content = eventData.content as string;
        return {
          id: messageId,
          role: "user",
          subtype: "user",
          content,
          timestamp,
        } as UserMessage;
      }

      case "assistant_message": {
        const content = eventData.content as ContentPart[];
        return {
          id: messageId,
          role: "assistant",
          subtype: "assistant",
          content,
          timestamp,
        } as AssistantMessage;
      }

      case "tool_call_message": {
        const toolCalls = eventData.toolCalls as ToolCallPart[];
        // ToolCallMessage stores single toolCall, take first one
        const toolCall = toolCalls[0];
        return {
          id: messageId,
          role: "assistant",
          subtype: "tool-call",
          toolCall,
          timestamp,
        } as ToolCallMessage;
      }

      case "tool_result_message": {
        const results = eventData.results as ToolResultPart[];
        // ToolResultMessage stores single toolResult, take first one
        const toolResult = results[0];
        return {
          id: messageId,
          role: "tool",
          subtype: "tool-result",
          toolCallId: toolResult.id, // ToolResultPart uses 'id' for tool call reference
          toolResult,
          timestamp,
        } as ToolResultMessage;
      }

      default:
        logger.warn("Unknown message type, passing through", { type: output.type });
        return eventData as unknown as Message;
    }
  }

  /**
   * Determine event category from output type
   */
  private getCategoryForOutput(output: AgentOutput): EventCategory {
    const type = output.type;

    // Stream events - SKIP these, handled by DriveableEvent
    if (
      type === "message_start" ||
      type === "message_delta" ||
      type === "message_stop" ||
      type === "text_delta" ||
      type === "tool_use_start" ||
      type === "input_json_delta" ||
      type === "tool_use_stop" ||
      type === "tool_result"
    ) {
      return "stream";
    }

    // Message events
    if (
      type === "user_message" ||
      type === "assistant_message" ||
      type === "tool_call_message" ||
      type === "tool_result_message"
    ) {
      return "message";
    }

    // Turn events
    if (type === "turn_request" || type === "turn_response") {
      return "turn";
    }

    // State events (default)
    return "state";
  }
}

/**
 * RuntimeAgent - Full Agent with Engine + Sandbox + Session
 */
export class RuntimeAgent implements RuntimeAgentInterface {
  readonly agentId: string;
  readonly imageId: string;
  readonly name: string;
  readonly containerId: string;
  readonly createdAt: number;

  private _lifecycle: AgentLifecycle = "running";
  private readonly engine: AgentEngine;
  private readonly driver: BusDriver;
  private readonly producer: SystemBusProducer;
  readonly session: Session;
  readonly config: AgentConfig;

  constructor(config: RuntimeAgentConfig) {
    this.agentId = config.agentId;
    this.imageId = config.imageId;
    this.name = config.config.name ?? `agent-${config.agentId}`;
    this.containerId = config.containerId;
    this.createdAt = Date.now();
    this.producer = config.bus.asProducer();
    this.session = config.session;
    this.config = config.config;
    // Note: sandbox is stored in config but not directly on this instance
    // It's used during agent creation but not needed after

    // Create Driver (needs both consumer and producer for bidirectional communication)
    this.driver = new BusDriver(
      config.bus.asConsumer(),
      config.bus.asProducer(),
      { agentId: this.agentId }
    );

    // Create Presenter (forwards to bus + collects to session)
    const presenter = new BusPresenter(
      this.producer,
      config.session,
      this.agentId,
      this.imageId,
      this.containerId
    );

    // Create Engine (from @agentxjs/agent)
    this.engine = createAgent({
      driver: this.driver,
      presenter,
    });
  }

  get lifecycle(): AgentLifecycle {
    return this._lifecycle;
  }

  async receive(message: string): Promise<void> {
    logger.debug("RuntimeAgent.receive called", { agentId: this.agentId, messagePreview: message.substring(0, 50) });
    if (this._lifecycle !== "running") {
      throw new Error(`Cannot send message to ${this._lifecycle} agent`);
    }
    logger.debug("Calling engine.receive", { agentId: this.agentId });
    await this.engine.receive(message);
    logger.debug("engine.receive completed", { agentId: this.agentId });
  }

  interrupt(): void {
    this.engine.interrupt();

    // Emit interrupted event
    this.producer.emit({
      type: "interrupted",
      timestamp: Date.now(),
      source: "agent",
      category: "lifecycle",
      intent: "notification",
      data: {
        agentId: this.agentId,
        containerId: this.containerId,
      },
      context: {
        containerId: this.containerId,
        imageId: this.imageId,
        agentId: this.agentId,
        sessionId: this.session.sessionId,
      },
    });
  }

  async stop(): Promise<void> {
    if (this._lifecycle === "destroyed") {
      throw new Error("Cannot stop destroyed agent");
    }
    this._lifecycle = "stopped";
  }

  async resume(): Promise<void> {
    if (this._lifecycle === "destroyed") {
      throw new Error("Cannot resume destroyed agent");
    }
    this._lifecycle = "running";

    // Emit session_resumed event
    this.producer.emit({
      type: "session_resumed",
      timestamp: Date.now(),
      source: "session",
      category: "lifecycle",
      intent: "notification",
      data: {
        sessionId: this.session.sessionId,
        agentId: this.agentId,
        containerId: this.containerId,
      },
      context: {
        containerId: this.containerId,
        imageId: this.imageId,
        agentId: this.agentId,
        sessionId: this.session.sessionId,
      },
    });
  }

  async destroy(): Promise<void> {
    if (this._lifecycle !== "destroyed") {
      await this.engine.destroy();
      this._lifecycle = "destroyed";

      // Emit session_destroyed event
      this.producer.emit({
        type: "session_destroyed",
        timestamp: Date.now(),
        source: "session",
        category: "lifecycle",
        intent: "notification",
        data: {
          sessionId: this.session.sessionId,
          agentId: this.agentId,
          containerId: this.containerId,
        },
        context: {
          containerId: this.containerId,
          imageId: this.imageId,
          agentId: this.agentId,
          sessionId: this.session.sessionId,
        },
      });
    }
  }
}
