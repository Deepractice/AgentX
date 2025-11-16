/**
 * BaseAgentDriver
 *
 * Base class for AgentDriver implementations using Template Method pattern.
 * Provides:
 * - Fixed event sequence (message_start → content → message_stop)
 * - StreamEventBuilder for easy event creation
 * - Hook methods for customization
 *
 * Subclasses only need to implement:
 * - generateContent() - Core message generation logic
 *
 * Optional hooks:
 * - getMessageId() - Custom message ID generation
 * - getModel() - Custom model name
 * - handleMultiTurn() - Multi-turn conversation handling
 *
 * @example
 * ```typescript
 * class MyDriver extends BaseAgentDriver {
 *   protected async *generateContent(message: UserMessage) {
 *     yield this.builder.textContentBlockStart(0);
 *     yield this.builder.textDelta("Hello", 0);
 *     yield this.builder.textContentBlockStop(0);
 *   }
 * }
 * ```
 */

import type { UserMessage } from "@deepractice-ai/agentx-types";
import type { StreamEventType } from "@deepractice-ai/agentx-event";
import type { AgentDriver } from "./AgentDriver";
import { StreamEventBuilder } from "./StreamEventBuilder";

export abstract class BaseAgentDriver implements AgentDriver {
  abstract readonly sessionId: string;
  abstract readonly driverSessionId: string | null;

  /**
   * StreamEventBuilder for creating events
   * Use this.builder.xxx() methods to create events
   */
  protected readonly builder: StreamEventBuilder;

  constructor(agentId: string) {
    this.builder = new StreamEventBuilder(agentId);
  }

  /**
   * Template method - implements the fixed event sequence
   *
   * Flow:
   * 1. Extract first message (single or from async iterable)
   * 2. messageStart event
   * 3. generateContent() - implemented by subclass
   * 4. messageStop event
   *
   * Subclasses can override this for full custom control,
   * but usually only need to implement generateContent().
   */
  async *sendMessage(
    messages: UserMessage | AsyncIterable<UserMessage>
  ): AsyncIterable<StreamEventType> {
    // Handle single message or async iterable
    const firstMessage = await this.getFirstMessage(messages);

    // Get message metadata
    const messageId = await this.getMessageId(firstMessage);
    const model = await this.getModel(firstMessage);

    // MUST: Start message
    yield this.builder.messageStart(messageId, model);

    // Core content generation - implemented by subclass
    yield* this.generateContent(firstMessage);

    // MUST: Stop message
    yield this.builder.messageStop();

    // Handle additional messages (multi-turn)
    if (this.isAsyncIterable(messages)) {
      yield* this.handleMultiTurn(messages, firstMessage);
    }
  }

  /**
   * Abstract hook - MUST be implemented by subclass
   *
   * Generate message content blocks.
   * Use this.builder methods to create events:
   * - this.builder.textContentBlockStart()
   * - this.builder.textDelta()
   * - this.builder.textContentBlockStop()
   * - this.builder.toolUseContentBlockStart()
   * - this.builder.inputJsonDelta()
   * - this.builder.toolUseContentBlockStop()
   *
   * @param message - User message to respond to
   * @returns Stream of content block events
   *
   * @example
   * ```typescript
   * protected async *generateContent(message: UserMessage) {
   *   // Text response
   *   yield this.builder.textContentBlockStart(0);
   *   yield this.builder.textDelta("Hello", 0);
   *   yield this.builder.textContentBlockStop(0);
   * }
   * ```
   */
  protected abstract generateContent(
    message: UserMessage
  ): AsyncIterable<StreamEventType>;

  /**
   * Hook - Get message ID
   *
   * Default: Generate timestamp-based ID
   * Override to use custom ID generation
   */
  protected async getMessageId(_message: UserMessage): Promise<string> {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Hook - Get model name
   *
   * Default: "default-model"
   * Override to return actual model name
   */
  protected async getModel(_message: UserMessage): Promise<string> {
    return "default-model";
  }

  /**
   * Hook - Handle multi-turn conversation
   *
   * Default: No-op (only process first message)
   * Override to implement multi-turn logic
   *
   * @param _messages - Async iterable of user messages
   * @param _firstMessage - First message already processed
   */
  protected async *handleMultiTurn(
    _messages: AsyncIterable<UserMessage>,
    _firstMessage: UserMessage
  ): AsyncIterable<StreamEventType> {
    // Default: do nothing
    // Subclasses can override to handle subsequent messages
  }

  /**
   * Abort current operation
   * Subclasses should override to implement abort logic
   */
  abstract abort(): void;

  /**
   * Destroy driver and release resources
   * Subclasses should override to implement cleanup logic
   */
  abstract destroy(): Promise<void>;

  /**
   * Helper - Extract first message from single or iterable
   */
  private async getFirstMessage(
    messages: UserMessage | AsyncIterable<UserMessage>
  ): Promise<UserMessage> {
    if (this.isAsyncIterable(messages)) {
      for await (const msg of messages) {
        return msg; // Return first message
      }
      throw new Error("[BaseAgentDriver] No messages in async iterable");
    }
    return messages;
  }

  /**
   * Helper - Type guard for AsyncIterable
   */
  private isAsyncIterable(
    value: unknown
  ): value is AsyncIterable<UserMessage> {
    return (
      value != null &&
      typeof value === "object" &&
      Symbol.asyncIterator in value
    );
  }
}
