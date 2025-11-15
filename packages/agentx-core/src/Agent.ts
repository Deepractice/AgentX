/**
 * Agent
 *
 * Core Agent implementation - provider-agnostic.
 * Provider is injected and handles all platform-specific logic.
 */

import type {
  Agent as IAgent,
  EventType,
  EventPayload,
  AgentEvent,
  UserMessageEvent,
} from "@deepractice-ai/agentx-api";
import { AgentAbortError } from "@deepractice-ai/agentx-api";
import type { Message } from "@deepractice-ai/agentx-types";
import type { AgentProvider } from "./AgentProvider";
import type { LoggerProvider } from "./LoggerProvider";
import { LogFormatter } from "./LoggerProvider";
import { AgentEventBus } from "./AgentEventBus";
import type { Subscription } from "rxjs";

export class Agent implements IAgent {
  readonly id: string;
  readonly sessionId: string;

  private _messages: Message[] = [];
  private eventHandlers: Map<EventType, Set<(payload: any) => void>> = new Map();
  private provider: AgentProvider;
  private logger?: LoggerProvider;
  private eventBus: AgentEventBus;
  private inboundSubscription: Subscription | null = null;

  constructor(config: unknown, provider: AgentProvider, logger?: LoggerProvider) {
    // Validate config (provider knows its own config type)
    provider.validateConfig(config);

    this.provider = provider;
    this.logger = logger;
    this.id = this.generateId();
    this.sessionId = provider.sessionId;

    // Create AgentEventBus
    this.eventBus = new AgentEventBus();

    // Log agent creation
    this.logger?.info(
      LogFormatter.agentLifecycle("created", this.id),
      {
        agentId: this.id,
        sessionId: this.sessionId,
        providerSessionId: provider.providerSessionId,
      }
    );

    // Connect provider to event bus and start listening to responses
    this.initializeEventBus();
  }

  private async initializeEventBus(): Promise<void> {
    // Connect provider (provider will subscribe to outbound)
    await this.provider.connect(this.eventBus);

    // Subscribe to inbound events
    this.inboundSubscription = this.eventBus.inbound().subscribe({
      next: (event) => {
        this.handleInboundEvent(event);
      },
      error: (error) => {
        this.logger?.error(
          LogFormatter.error("AgentEventBus error", error instanceof Error ? error : new Error(String(error))),
          {
            agentId: this.id,
            sessionId: this.sessionId,
            error,
          }
        );
      },
    });
  }

  get messages(): ReadonlyArray<Message> {
    return this._messages;
  }

  async send(message: string): Promise<void> {
    // Log user message
    this.logger?.debug(
      LogFormatter.messageFlow("user", message),
      {
        agentId: this.id,
        sessionId: this.sessionId,
        messageLength: message.length,
      }
    );

    // Add user message to history
    const userMessage: Message = {
      id: this.generateId(),
      role: "user",
      content: message,
      timestamp: Date.now(),
    };
    this._messages.push(userMessage);

    // Create and emit UserMessageEvent to AgentEventBus
    const userEvent: UserMessageEvent = {
      type: "user",
      uuid: this.generateId(),
      sessionId: this.sessionId,
      message: userMessage,
      timestamp: Date.now(),
    };

    this.logger?.debug(
      "Emitting user message to AgentEventBus",
      {
        agentId: this.id,
        sessionId: this.sessionId,
        historyLength: this._messages.length,
      }
    );

    // Emit to AgentEventBus (provider will consume via outbound)
    this.eventBus.emit(userEvent);

    // Also emit to local event handlers (for backward compatibility)
    this.emitEvent(userEvent);
  }

  /**
   * Handle inbound events from AgentEventBus
   * Called when provider emits responses
   */
  private handleInboundEvent(event: Exclude<AgentEvent, UserMessageEvent>): void {
    const eventSubtype = "subtype" in event ? event.subtype : undefined;

    this.logger?.debug(
      `Received inbound event: ${event.type}${eventSubtype ? `/${eventSubtype}` : ""}`,
      {
        agentId: this.id,
        sessionId: this.sessionId,
        eventType: event.type,
        eventSubtype,
      }
    );

    // Emit to local event handlers
    this.emitEvent(event);

    // Update messages on assistant response
    if (event.type === "assistant") {
      this._messages.push({
        id: event.message.id,
        role: "assistant",
        content: event.message.content,
        timestamp: event.message.timestamp,
      });

      this.logger?.debug(
        LogFormatter.messageFlow("assistant",
          typeof event.message.content === "string"
            ? event.message.content
            : JSON.stringify(event.message.content)
        ),
        {
          agentId: this.id,
          sessionId: this.sessionId,
          messageId: event.message.id,
        }
      );
    }
  }

  on<T extends EventType>(event: T, handler: (payload: EventPayload<T>) => void): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    this.logger?.debug(
      `Event handler registered: ${event}`,
      {
        agentId: this.id,
        sessionId: this.sessionId,
        eventType: event,
        totalHandlers: this.eventHandlers.get(event)!.size,
      }
    );

    // Return unregister function
    return () => {
      this.off(event, handler);
    };
  }

  off<T extends EventType>(event: T, handler: (payload: EventPayload<T>) => void): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);

      this.logger?.debug(
        `Event handler unregistered: ${event}`,
        {
          agentId: this.id,
          sessionId: this.sessionId,
          eventType: event,
          remainingHandlers: handlers.size,
        }
      );
    }
  }

  clear(): void {
    this.logger?.info(
      "Clearing agent messages and aborting current operation",
      {
        agentId: this.id,
        sessionId: this.sessionId,
        clearedMessages: this._messages.length,
      }
    );

    this._messages = [];
    this.provider.abort();
  }

  destroy(): void {
    this.logger?.info(
      LogFormatter.agentLifecycle("destroying", this.id),
      {
        agentId: this.id,
        sessionId: this.sessionId,
        registeredHandlers: this.eventHandlers.size,
        messageHistory: this._messages.length,
      }
    );

    this.clear();
    this.eventHandlers.clear();

    // Unsubscribe from inbound events
    if (this.inboundSubscription) {
      this.inboundSubscription.unsubscribe();
      this.inboundSubscription = null;
    }

    // Close event bus
    this.eventBus.close();

    // Destroy provider
    this.provider.destroy();

    this.logger?.info(
      LogFormatter.agentLifecycle("destroyed", this.id),
      {
        agentId: this.id,
        sessionId: this.sessionId,
      }
    );
  }

  private emitEvent(event: AgentEvent): void {
    const handlers = this.eventHandlers.get(event.type);
    const subtype = "subtype" in event ? event.subtype : undefined;

    this.logger?.debug(
      LogFormatter.eventEmission(
        subtype ? `${event.type}/${subtype}` : event.type,
        this.sessionId
      ),
      {
        agentId: this.id,
        sessionId: this.sessionId,
        eventType: event.type,
        eventSubtype: subtype,
        handlerCount: handlers?.size ?? 0,
      }
    );

    if (handlers) {
      handlers.forEach((handler, index) => {
        try {
          handler(event);
        } catch (error) {
          this.logger?.error(
            `Event handler execution failed for ${event.type}`,
            {
              agentId: this.id,
              sessionId: this.sessionId,
              eventType: event.type,
              eventSubtype: subtype,
              handlerIndex: index,
              error: error instanceof Error ? error : new Error(String(error)),
            }
          );
        }
      });
    }
  }

  private generateId(): string {
    return `agent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
