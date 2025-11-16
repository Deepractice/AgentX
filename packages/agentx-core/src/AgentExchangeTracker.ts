/**
 * AgentExchangeTracker
 *
 * Tracks request-response exchange pairs and generates Exchange Layer events.
 *
 * Architecture:
 * ```
 * Message Events (from MessageAssembler)
 *     ↓ Subscribe & Track
 * AgentExchangeTracker (this class)
 *     ↓ Emit
 * Exchange Events (to EventBus)
 * ```
 *
 * Responsibilities:
 * 1. Subscribe to Message Layer events
 * 2. Track user requests and assistant responses
 * 3. Pair requests with responses to form exchanges
 * 4. Calculate exchange-level metrics (duration, cost, tokens)
 * 5. Emit Exchange Layer events
 *
 * Exchange Flow:
 * ```
 * UserMessageEvent
 *     ↓
 * ExchangeRequestEvent { userMessage, requestedAt }
 *     ↓ [Agent processes...]
 * AssistantMessageEvent
 *     ↓
 * ExchangeResponseEvent { assistantMessage, duration, cost, tokens }
 * ```
 *
 * Example:
 * ```typescript
 * const tracker = new AgentExchangeTracker(agentId, eventBus);
 *
 * // User message arrives
 * eventBus.emit(userMessageEvent);
 * // → ExchangeRequestEvent
 *
 * // Assistant responds
 * eventBus.emit(assistantMessageEvent);
 * // → ExchangeResponseEvent { duration: 1500ms, tokens: 120, cost: $0.002 }
 * ```
 */

import type { EventBus, EventConsumer, Unsubscribe } from "@deepractice-ai/agentx-event";
import type {
  // Message Events (input)
  UserMessageEvent,
  AssistantMessageEvent,
  // Exchange Events (output)
  ExchangeRequestEvent,
  ExchangeResponseEvent,
} from "@deepractice-ai/agentx-event";
import type { UserMessage, TokenUsage } from "@deepractice-ai/agentx-types";

/**
 * Pending exchange tracking
 */
interface PendingExchange {
  exchangeId: string;
  userMessage: UserMessage;
  requestedAt: number;
}

/**
 * AgentExchangeTracker
 *
 * Tracks request-response pairs and generates Exchange events.
 */
export class AgentExchangeTracker {
  private agentId: string;
  private eventBus: EventBus;
  private consumer: EventConsumer;
  private unsubscribers: Unsubscribe[] = [];

  // Exchange tracking
  private pendingExchange: PendingExchange | null = null;

  // Cost calculation (configurable)
  private costPerInputToken: number = 0.000003; // $3 per 1M tokens
  private costPerOutputToken: number = 0.000015; // $15 per 1M tokens

  constructor(agentId: string, eventBus: EventBus) {
    this.agentId = agentId;
    this.eventBus = eventBus;
    this.consumer = eventBus.createConsumer();

    this.subscribeToMessageEvents();
  }

  /**
   * Configure cost calculation
   */
  configureCost(inputTokenCost: number, outputTokenCost: number): void {
    this.costPerInputToken = inputTokenCost;
    this.costPerOutputToken = outputTokenCost;
  }

  /**
   * Subscribe to Message Layer events
   */
  private subscribeToMessageEvents(): void {
    // User messages start new exchanges
    this.unsubscribers.push(
      this.consumer.consumeByType("user_message", (event) => {
        this.onUserMessage(event as UserMessageEvent);
      })
    );

    // Assistant messages complete exchanges
    this.unsubscribers.push(
      this.consumer.consumeByType("assistant_message", (event) => {
        this.onAssistantMessage(event as AssistantMessageEvent);
      })
    );
  }

  /**
   * Handle UserMessageEvent
   * Creates new exchange and emits ExchangeRequestEvent
   */
  private onUserMessage(event: UserMessageEvent): void {
    const exchangeId = this.generateId();

    // Store pending exchange
    this.pendingExchange = {
      exchangeId,
      userMessage: event.data,
      requestedAt: event.timestamp,
    };

    // Emit ExchangeRequestEvent
    const requestEvent: ExchangeRequestEvent = {
      type: "exchange_request",
      uuid: this.generateId(),
      agentId: this.agentId,
      timestamp: Date.now(),
      exchangeId,
      data: {
        userMessage: event.data,
        requestedAt: event.timestamp,
      },
    };

    this.emitExchangeEvent(requestEvent);
  }

  /**
   * Handle AssistantMessageEvent
   * Completes pending exchange and emits ExchangeResponseEvent
   */
  private onAssistantMessage(event: AssistantMessageEvent): void {
    if (!this.pendingExchange) {
      // No pending exchange, skip
      return;
    }

    const { exchangeId, requestedAt } = this.pendingExchange;
    const completedAt = event.timestamp;
    const duration = completedAt - requestedAt;

    // Calculate cost from token usage
    const usage = event.data.usage || { input: 0, output: 0 };
    const cost = this.calculateCost(usage);

    // Emit ExchangeResponseEvent
    const responseEvent: ExchangeResponseEvent = {
      type: "exchange_response",
      uuid: this.generateId(),
      agentId: this.agentId,
      timestamp: Date.now(),
      exchangeId,
      data: {
        assistantMessage: event.data,
        respondedAt: completedAt,
        durationMs: duration,
        usage: usage,
        costUsd: cost,
      },
    };

    this.emitExchangeEvent(responseEvent);

    // Clear pending exchange
    this.pendingExchange = null;
  }

  /**
   * Calculate cost from token usage
   */
  private calculateCost(usage: TokenUsage): number {
    const inputCost = usage.input * this.costPerInputToken;
    const outputCost = usage.output * this.costPerOutputToken;
    return inputCost + outputCost;
  }

  /**
   * Emit Exchange event to EventBus
   */
  private emitExchangeEvent(event: ExchangeRequestEvent | ExchangeResponseEvent): void {
    const producer = this.eventBus.createProducer();
    producer.produce(event as any);
  }

  /**
   * Destroy tracker and unsubscribe
   */
  destroy(): void {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
    this.pendingExchange = null;
  }

  private generateId(): string {
    return `exchange_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
