/**
 * AgentMessageAssembler
 *
 * Assembles complete Message Layer events from Stream Layer events.
 *
 * Architecture:
 * ```
 * Stream Events (deltas from Driver)
 *     ↓ Subscribe & Accumulate
 * AgentMessageAssembler (this class)
 *     ↓ Emit
 * Message Events (to EventBus)
 * ```
 *
 * Responsibilities:
 * 1. Subscribe to Stream Layer delta events
 * 2. Accumulate incremental data (text deltas, tool input JSON, etc.)
 * 3. Detect completion signals (MessageStopEvent, ContentBlockStopEvent)
 * 4. Assemble and emit complete Message events
 *
 * Event Assembly:
 * ```
 * TextDeltaEvent ("Hello") + TextDeltaEvent (" world") + TextContentBlockStopEvent
 *     ↓
 * AssistantMessageEvent { content: "Hello world" }
 *
 * InputJsonDeltaEvent ('{"a":') + InputJsonDeltaEvent ('2}') + ToolUseContentBlockStopEvent
 *     ↓
 * ToolUseMessageEvent { toolCall, toolResult }
 * ```
 *
 * Example:
 * ```typescript
 * const assembler = new AgentMessageAssembler(agentId, eventBus);
 *
 * // Stream deltas arrive
 * eventBus.emit(textDeltaEvent1);
 * eventBus.emit(textDeltaEvent2);
 * eventBus.emit(textContentBlockStopEvent);
 *
 * // Assembler automatically emits
 * // → AssistantMessageEvent { content: "Hello world" }
 * ```
 */

import type { EventBus, EventConsumer, Unsubscribe } from "@deepractice-ai/agentx-event";
import type {
  // Stream Events (input)
  TextDeltaEvent,
  TextContentBlockStopEvent,
  InputJsonDeltaEvent,
  ToolUseContentBlockStartEvent,
  ToolUseContentBlockStopEvent,
  MessageStopEvent,
  // Message Events (output)
  AssistantMessageEvent,
  ToolUseMessageEvent,
  UserMessageEvent,
} from "@deepractice-ai/agentx-event";
import type {
  AssistantMessage,
  ToolUseMessage,
  ToolCallPart,
  ToolResultPart,
} from "@deepractice-ai/agentx-types";

/**
 * Pending content accumulator
 */
interface PendingContent {
  type: "text" | "tool_use";
  index: number;
  // For text content
  textDeltas?: string[];
  // For tool use
  toolId?: string;
  toolName?: string;
  toolInputJson?: string;
}

/**
 * AgentMessageAssembler
 *
 * Assembles complete Message events from Stream deltas.
 */
export class AgentMessageAssembler {
  private agentId: string;
  private eventBus: EventBus;
  private consumer: EventConsumer;
  private unsubscribers: Unsubscribe[] = [];

  // Content accumulation
  private pendingContents: Map<number, PendingContent> = new Map();
  private currentMessageId: string | null = null;
  private messageStartTime: number | null = null;

  constructor(agentId: string, eventBus: EventBus) {
    this.agentId = agentId;
    this.eventBus = eventBus;
    this.consumer = eventBus.createConsumer();

    this.subscribeToStreamEvents();
  }

  /**
   * Subscribe to Stream Layer events
   */
  private subscribeToStreamEvents(): void {
    // Text content deltas
    this.unsubscribers.push(
      this.consumer.consumeByType("text_delta", (event) => {
        this.onTextDelta(event as TextDeltaEvent);
      })
    );

    this.unsubscribers.push(
      this.consumer.consumeByType("text_content_block_stop", (event) => {
        this.onTextContentBlockStop(event as TextContentBlockStopEvent);
      })
    );

    // Tool use content
    this.unsubscribers.push(
      this.consumer.consumeByType("tool_use_content_block_start", (event) => {
        this.onToolUseContentBlockStart(event as ToolUseContentBlockStartEvent);
      })
    );

    this.unsubscribers.push(
      this.consumer.consumeByType("input_json_delta", (event) => {
        this.onInputJsonDelta(event as InputJsonDeltaEvent);
      })
    );

    this.unsubscribers.push(
      this.consumer.consumeByType("tool_use_content_block_stop", (event) => {
        this.onToolUseContentBlockStop(event as ToolUseContentBlockStopEvent);
      })
    );

    // Message lifecycle
    this.unsubscribers.push(
      this.consumer.consumeByType("message_start", (event) => {
        this.onMessageStart(event);
      })
    );

    this.unsubscribers.push(
      this.consumer.consumeByType("message_stop", (event) => {
        this.onMessageStop(event as MessageStopEvent);
      })
    );

    // User messages (pass-through)
    this.unsubscribers.push(
      this.consumer.consumeByType("user_message", (event) => {
        this.onUserMessage(event as UserMessageEvent);
      })
    );
  }

  /**
   * Handle message start
   */
  private onMessageStart(event: any): void {
    this.currentMessageId = this.generateId();
    this.messageStartTime = event.timestamp;
    this.pendingContents.clear();
  }

  /**
   * Handle TextDeltaEvent
   * Accumulate text deltas for later assembly
   */
  private onTextDelta(event: TextDeltaEvent): void {
    // Use index 0 for text content (single text block)
    const index = 0;

    if (!this.pendingContents.has(index)) {
      this.pendingContents.set(index, {
        type: "text",
        index,
        textDeltas: [],
      });
    }

    const pending = this.pendingContents.get(index)!;
    if (pending.type === "text") {
      pending.textDeltas!.push(event.data.text);
    }
  }

  /**
   * Handle TextContentBlockStopEvent
   * Assemble accumulated text deltas (but don't emit yet, wait for MessageStop)
   */
  private onTextContentBlockStop(_event: TextContentBlockStopEvent): void {
    // Text accumulation is complete, but we wait for MessageStop to emit
  }

  /**
   * Handle ToolUseContentBlockStartEvent
   * Initialize tool use accumulator
   */
  private onToolUseContentBlockStart(event: ToolUseContentBlockStartEvent): void {
    // Use index 1 for tool content (separate from text block)
    const index = 1;

    this.pendingContents.set(index, {
      type: "tool_use",
      index,
      toolId: event.data.id,
      toolName: event.data.name,
      toolInputJson: "",
    });
  }

  /**
   * Handle InputJsonDeltaEvent
   * Accumulate tool input JSON deltas
   */
  private onInputJsonDelta(event: InputJsonDeltaEvent): void {
    // Use index 1 for tool content
    const index = 1;
    const pending = this.pendingContents.get(index);

    if (pending && pending.type === "tool_use") {
      pending.toolInputJson! += event.data.partialJson;
    }
  }

  /**
   * Handle ToolUseContentBlockStopEvent
   * Assemble complete ToolUseMessage event
   */
  private onToolUseContentBlockStop(_event: ToolUseContentBlockStopEvent): void {
    // Use index 1 for tool content
    const index = 1;
    const pending = this.pendingContents.get(index);

    if (!pending || pending.type !== "tool_use") {
      return;
    }

    try {
      // Parse accumulated JSON
      const toolInput = pending.toolInputJson
        ? JSON.parse(pending.toolInputJson)
        : {};

      // Create ToolCallPart
      const toolCall: ToolCallPart = {
        type: "tool-call",
        id: pending.toolId!,
        name: pending.toolName!,
        input: toolInput,
      };

      // Create ToolResultPart (placeholder, will be filled later by actual tool execution)
      const toolResult: ToolResultPart = {
        type: "tool-result",
        id: pending.toolId!,
        name: pending.toolName!,
        output: {
          type: "text",
          value: "", // Will be filled by tool execution
        },
      };

      // Create ToolUseMessage
      const toolUseMessage: ToolUseMessage = {
        id: this.generateId(),
        role: "tool-use",
        toolCall,
        toolResult,
        timestamp: Date.now(),
      };

      // Emit ToolUseMessageEvent
      const toolUseEvent: ToolUseMessageEvent = {
        type: "tool_use_message",
        uuid: this.generateId(),
        agentId: this.agentId,
        timestamp: Date.now(),
        data: toolUseMessage,
      };

      this.emitMessageEvent(toolUseEvent);

      // Remove from pending
      this.pendingContents.delete(index);
    } catch (error) {
      console.error("[AgentMessageAssembler] Failed to parse tool input JSON:", error);
    }
  }

  /**
   * Handle MessageStopEvent
   * Assemble complete AssistantMessage from all accumulated content
   */
  private onMessageStop(event: MessageStopEvent): void {
    if (!this.currentMessageId) {
      return;
    }

    // Assemble all text content
    const textParts: string[] = [];

    // Sort by index to maintain order
    const sortedContents = Array.from(this.pendingContents.values())
      .sort((a, b) => a.index - b.index);

    for (const pending of sortedContents) {
      if (pending.type === "text" && pending.textDeltas) {
        const fullText = pending.textDeltas.join("");
        textParts.push(fullText);
      }
    }

    // Create AssistantMessage
    const assistantMessage: AssistantMessage = {
      id: this.currentMessageId,
      role: "assistant",
      content: textParts.join(""), // Combine all text parts
      timestamp: this.messageStartTime || Date.now(),
      usage: event.data.usage,
    };

    // Emit AssistantMessageEvent
    const assistantEvent: AssistantMessageEvent = {
      type: "assistant_message",
      uuid: this.generateId(),
      agentId: this.agentId,
      timestamp: Date.now(),
      data: assistantMessage,
    };

    this.emitMessageEvent(assistantEvent);

    // Reset state
    this.currentMessageId = null;
    this.messageStartTime = null;
    this.pendingContents.clear();
  }

  /**
   * Handle UserMessageEvent (pass-through)
   * User messages are already complete, just re-emit
   */
  private onUserMessage(event: UserMessageEvent): void {
    // User messages don't need assembly, they're already complete
    // This is just a pass-through
    this.emitMessageEvent(event);
  }

  /**
   * Emit Message event to EventBus
   */
  private emitMessageEvent(
    event: UserMessageEvent | AssistantMessageEvent | ToolUseMessageEvent
  ): void {
    const producer = this.eventBus.createProducer();
    producer.produce(event as any);
  }

  /**
   * Destroy assembler and unsubscribe
   */
  destroy(): void {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
    this.pendingContents.clear();
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
