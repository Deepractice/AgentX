/**
 * ClaudeDriver - Claude SDK Driver Implementation
 *
 * Implements the Driver interface to bridge EventBus and Claude SDK:
 * - Subscribes to user_message events from EventBus
 * - Sends messages to Claude SDK
 * - Emits DriveableEvent (StreamEvent) to EventBus
 *
 * ```
 *                         EventBus
 *                        ↗        ↘
 *         subscribe     │          │     emit
 *         user_message  │          │     DriveableEvent
 *              ↓        │          │      ↑
 *         ┌─────────────────────────────────────┐
 *         │           ClaudeDriver               │
 *         │                                      │
 *         │   user_message ───► SDK ───► Stream  │
 *         │                                      │
 *         └─────────────────────────────────────┘
 *                              │
 *                              ▼
 *                       Claude SDK
 * ```
 */

import type {
  Driver,
  DriverConfig,
  CreateDriverOptions,
  DriverFactory,
} from "@agentxjs/core/driver";
import type { EventConsumer, EventProducer, BusEvent, DriveableEvent } from "@agentxjs/core/event";
import type { UserMessage } from "@agentxjs/core/agent";
import type { SDKMessage, SDKPartialAssistantMessage } from "@anthropic-ai/claude-agent-sdk";
import { Subject, Subscription, TimeoutError } from "rxjs";
import { timeout } from "rxjs/operators";
import { createLogger } from "commonxjs/logger";
import { buildSDKUserMessage } from "./helpers";
import { SDKQueryLifecycle } from "./SDKQueryLifecycle";

const logger = createLogger("claude-driver/ClaudeDriver");

/** Default timeout in milliseconds (10 minutes) */
const DEFAULT_TIMEOUT = 600_000;

/**
 * Event context for correlation
 */
interface EventContext {
  agentId?: string;
  sessionId?: string;
  containerId?: string;
  imageId?: string;
  turnId?: string;
  correlationId?: string;
}

/**
 * Metadata for tracking requests
 */
interface RequestMeta {
  requestId: string;
  context: EventContext;
}

/**
 * Context for tracking content block state across events
 */
interface ContentBlockContext {
  currentBlockType: "text" | "tool_use" | null;
  currentBlockIndex: number;
  currentToolId: string | null;
  currentToolName: string | null;
  lastStopReason: string | null;
  lastStopSequence: string | null;
}

/**
 * ClaudeDriver - Driver implementation for Claude SDK
 */
export class ClaudeDriver implements Driver {
  readonly name = "ClaudeDriver";

  private readonly agentId: string;
  private readonly config: DriverConfig;
  private readonly queryLifecycle: SDKQueryLifecycle;

  private producer: EventProducer | null = null;
  private unsubscribes: (() => void)[] = [];

  private currentMeta: RequestMeta | null = null;
  private wasInterrupted = false;

  /** Subject for tracking pending request - completes when result received */
  private pendingRequest$: Subject<void> | null = null;
  /** Subscription for timeout handling */
  private pendingSubscription: Subscription | null = null;

  /** Context for tracking content block state */
  private blockContext: ContentBlockContext = {
    currentBlockType: null,
    currentBlockIndex: 0,
    currentToolId: null,
    currentToolName: null,
    lastStopReason: null,
    lastStopSequence: null,
  };

  constructor(options: CreateDriverOptions) {
    this.agentId = options.agentId;
    this.config = options.config;

    // Create SDK lifecycle with callbacks
    this.queryLifecycle = new SDKQueryLifecycle(
      {
        apiKey: options.config.apiKey,
        baseUrl: options.config.baseUrl,
        model: options.config.model,
        systemPrompt: options.config.systemPrompt,
        cwd: options.config.cwd,
        resumeSessionId: options.resumeSessionId,
        mcpServers: options.config.mcpServers,
      },
      {
        onStreamEvent: (msg) => this.handleStreamEvent(msg),
        onUserMessage: (msg) => this.handleUserMessage(msg),
        onResult: (msg) => this.handleResult(msg),
        onSessionIdCaptured: options.onSessionIdCaptured,
        onError: (error) => this.handleError(error),
        onListenerExit: (reason) => this.handleListenerExit(reason),
      }
    );
  }

  /**
   * Connect to EventBus
   */
  connect(consumer: EventConsumer, producer: EventProducer): void {
    this.producer = producer;

    logger.debug("ClaudeDriver connected to EventBus", { agentId: this.agentId });

    // Subscribe to user_message events
    const unsubUserMessage = consumer.on("user_message", async (evt: BusEvent) => {
      const typedEvent = evt as BusEvent & {
        data: UserMessage;
        requestId?: string;
        context?: EventContext;
      };

      // Filter by agentId
      if (typedEvent.context?.agentId !== this.agentId) {
        return;
      }

      const message = typedEvent.data;
      const meta: RequestMeta = {
        requestId: typedEvent.requestId || `req_${Date.now()}`,
        context: typedEvent.context || {},
      };
      await this.send(message, meta);
    });
    this.unsubscribes.push(unsubUserMessage);

    // Subscribe to interrupt events
    const unsubInterrupt = consumer.on("interrupt_request", (evt: BusEvent) => {
      const typedEvent = evt as BusEvent & {
        requestId?: string;
        context?: EventContext;
      };

      // Filter by agentId
      if (typedEvent.context?.agentId !== this.agentId) {
        return;
      }

      const meta: RequestMeta = {
        requestId: typedEvent.requestId || "",
        context: typedEvent.context || {},
      };
      this.interrupt(meta);
    });
    this.unsubscribes.push(unsubInterrupt);
  }

  /**
   * Disconnect from EventBus
   */
  disconnect(): void {
    for (const unsub of this.unsubscribes) {
      unsub();
    }
    this.unsubscribes = [];
    this.producer = null;
    logger.debug("ClaudeDriver disconnected from EventBus", { agentId: this.agentId });
  }

  /**
   * Dispose driver resources
   */
  dispose(): void {
    logger.debug("Disposing ClaudeDriver", { agentId: this.agentId });
    this.disconnect();
    this.cleanupPendingRequest();
    this.queryLifecycle.dispose();
    logger.debug("ClaudeDriver disposed", { agentId: this.agentId });
  }

  /**
   * Send a message to Claude SDK
   */
  private async send(message: UserMessage, meta: RequestMeta): Promise<void> {
    this.wasInterrupted = false;
    this.currentMeta = meta;

    // Clean up previous pending request
    this.cleanupPendingRequest();

    const timeoutMs = this.config.timeout ?? DEFAULT_TIMEOUT;

    try {
      // Initialize SDK if needed
      await this.queryLifecycle.initialize();

      const sessionId = meta.context.sessionId || "default";
      const sdkUserMessage = buildSDKUserMessage(message, sessionId);

      logger.debug("Sending message to Claude", {
        content:
          typeof message.content === "string" ? message.content.substring(0, 80) : "[structured]",
        timeout: timeoutMs,
        requestId: meta.requestId,
      });

      // Create pending request with timeout
      this.pendingRequest$ = new Subject<void>();
      this.pendingSubscription = this.pendingRequest$.pipe(timeout(timeoutMs)).subscribe({
        complete: () => {
          logger.debug("Request completed within timeout", { requestId: meta.requestId });
        },
        error: (err) => {
          if (err instanceof TimeoutError) {
            logger.warn("Request timeout", { timeout: timeoutMs, requestId: meta.requestId });
            this.handleTimeout(meta);
          }
        },
      });

      // Send message via lifecycle
      this.queryLifecycle.send(sdkUserMessage);
    } catch (error) {
      this.cleanupPendingRequest();
      throw error;
    }
  }

  /**
   * Interrupt current operation
   */
  private interrupt(meta?: RequestMeta): void {
    logger.debug("Interrupting Claude query", { requestId: meta?.requestId });
    this.wasInterrupted = true;
    if (meta) {
      this.currentMeta = meta;
    }
    this.queryLifecycle.interrupt();
  }

  /**
   * Handle stream_event from SDK
   */
  private handleStreamEvent(msg: SDKMessage): void {
    if (this.currentMeta) {
      this.processStreamEvent(msg as SDKPartialAssistantMessage);
    }
  }

  /**
   * Handle user message from SDK (contains tool_result)
   */
  private handleUserMessage(msg: SDKMessage): void {
    if (!this.currentMeta) return;

    const { requestId, context } = this.currentMeta;
    const sdkMsg = msg as { message?: { content?: unknown[] } };

    if (!sdkMsg.message || !Array.isArray(sdkMsg.message.content)) {
      return;
    }

    for (const block of sdkMsg.message.content) {
      if (block && typeof block === "object" && "type" in block && block.type === "tool_result") {
        const toolResultBlock = block as unknown as {
          tool_use_id: string;
          content: unknown;
          is_error?: boolean;
        };

        this.emitToBus({
          type: "tool_result",
          timestamp: Date.now(),
          source: "driver",
          category: "stream",
          intent: "notification",
          requestId,
          context,
          data: {
            toolUseId: toolResultBlock.tool_use_id,
            result: toolResultBlock.content,
            isError: toolResultBlock.is_error || false,
          },
        });
      }
    }
  }

  /**
   * Handle result from SDK
   */
  private handleResult(msg: SDKMessage): void {
    // Complete pending request - cancels timeout
    this.completePendingRequest();

    const resultMsg = msg as {
      subtype: string;
      is_error?: boolean;
      errors?: string[];
      error?: { message?: string; type?: string };
      result?: string;
    };

    logger.info("SDK result received", {
      subtype: resultMsg.subtype,
      isError: resultMsg.is_error,
      wasInterrupted: this.wasInterrupted,
    });

    // Handle user interrupt
    if (resultMsg.subtype === "error_during_execution" && this.wasInterrupted) {
      this.emitInterrupted("user_interrupt");
      return;
    }

    // Handle SDK errors
    if (resultMsg.is_error && this.currentMeta) {
      const errorMessage =
        resultMsg.error?.message ||
        resultMsg.errors?.join(", ") ||
        (typeof resultMsg.result === "string" ? resultMsg.result : null) ||
        "An error occurred";
      const errorCode = resultMsg.error?.type || resultMsg.subtype || "api_error";
      this.emitError(errorMessage, errorCode);
    }
  }

  /**
   * Handle error from SDK lifecycle
   */
  private handleError(error: Error): void {
    this.cleanupPendingRequest();
    if (this.currentMeta) {
      this.emitError(error.message, "runtime_error");
    }
  }

  /**
   * Handle listener exit from SDK lifecycle
   */
  private handleListenerExit(reason: "normal" | "abort" | "error"): void {
    logger.debug("SDK listener exited", { reason });
    this.cleanupPendingRequest();
  }

  /**
   * Handle request timeout
   */
  private handleTimeout(_meta: RequestMeta): void {
    this.wasInterrupted = true;
    this.queryLifecycle.interrupt();
    this.emitError(`Request timeout after ${this.config.timeout ?? DEFAULT_TIMEOUT}ms`, "timeout");
  }

  /**
   * Process stream_event from SDK and emit corresponding DriveableEvent
   */
  private processStreamEvent(sdkMsg: SDKPartialAssistantMessage): void {
    const event = sdkMsg.event;
    const { requestId, context } = this.currentMeta || {};

    switch (event.type) {
      case "message_start":
        // Reset context on new message
        this.blockContext = {
          currentBlockType: null,
          currentBlockIndex: 0,
          currentToolId: null,
          currentToolName: null,
          lastStopReason: null,
          lastStopSequence: null,
        };

        this.emitToBus({
          type: "message_start",
          timestamp: Date.now(),
          source: "driver",
          category: "stream",
          intent: "notification",
          requestId,
          context,
          data: {
            message: {
              id: event.message.id,
              model: event.message.model,
            },
          },
        });
        break;

      case "content_block_start": {
        const contentBlock = event.content_block as { type: string; id?: string; name?: string };
        this.blockContext.currentBlockIndex = event.index;

        if (contentBlock.type === "text") {
          this.blockContext.currentBlockType = "text";
          this.emitToBus({
            type: "text_content_block_start",
            timestamp: Date.now(),
            source: "driver",
            category: "stream",
            intent: "notification",
            index: event.index,
            requestId,
            context,
            data: {},
          });
        } else if (contentBlock.type === "tool_use") {
          this.blockContext.currentBlockType = "tool_use";
          this.blockContext.currentToolId = contentBlock.id || null;
          this.blockContext.currentToolName = contentBlock.name || null;
          this.emitToBus({
            type: "tool_use_content_block_start",
            timestamp: Date.now(),
            source: "driver",
            category: "stream",
            intent: "notification",
            index: event.index,
            requestId,
            context,
            data: {
              id: contentBlock.id || "",
              name: contentBlock.name || "",
            },
          });
        }
        break;
      }

      case "content_block_delta": {
        const delta = event.delta as { type: string; text?: string; partial_json?: string };

        if (delta.type === "text_delta") {
          this.emitToBus({
            type: "text_delta",
            timestamp: Date.now(),
            source: "driver",
            category: "stream",
            intent: "notification",
            requestId,
            context,
            data: { text: delta.text || "" },
          });
        } else if (delta.type === "input_json_delta") {
          this.emitToBus({
            type: "input_json_delta",
            timestamp: Date.now(),
            source: "driver",
            category: "stream",
            intent: "notification",
            index: this.blockContext.currentBlockIndex,
            requestId,
            context,
            data: { partialJson: delta.partial_json || "" },
          });
        }
        break;
      }

      case "content_block_stop":
        if (this.blockContext.currentBlockType === "tool_use" && this.blockContext.currentToolId) {
          this.emitToBus({
            type: "tool_use_content_block_stop",
            timestamp: Date.now(),
            source: "driver",
            category: "stream",
            intent: "notification",
            index: this.blockContext.currentBlockIndex,
            requestId,
            context,
            data: {},
          });
        } else {
          this.emitToBus({
            type: "text_content_block_stop",
            timestamp: Date.now(),
            source: "driver",
            category: "stream",
            intent: "notification",
            index: this.blockContext.currentBlockIndex,
            requestId,
            context,
            data: {},
          });
        }
        // Reset current block type after stop
        this.blockContext.currentBlockType = null;
        this.blockContext.currentToolId = null;
        this.blockContext.currentToolName = null;
        break;

      case "message_delta": {
        const msgDelta = event.delta as { stop_reason?: string; stop_sequence?: string };
        if (msgDelta.stop_reason) {
          this.blockContext.lastStopReason = msgDelta.stop_reason;
          this.blockContext.lastStopSequence = msgDelta.stop_sequence || null;
        }
        break;
      }

      case "message_stop":
        this.emitToBus({
          type: "message_stop",
          timestamp: Date.now(),
          source: "driver",
          category: "stream",
          intent: "notification",
          requestId,
          context,
          data: {
            stopReason: (this.blockContext.lastStopReason || "end_turn") as
              | "end_turn"
              | "max_tokens"
              | "tool_use"
              | "stop_sequence"
              | "content_filter"
              | "error"
              | "other",
            stopSequence: this.blockContext.lastStopSequence ?? undefined,
          },
        });
        // Reset after emitting
        this.blockContext.lastStopReason = null;
        this.blockContext.lastStopSequence = null;
        break;
    }
  }

  /**
   * Emit interrupted event
   */
  private emitInterrupted(reason: "user_interrupt" | "timeout" | "error" | "system"): void {
    this.emitToBus({
      type: "interrupted",
      timestamp: Date.now(),
      source: "driver",
      category: "stream",
      intent: "notification",
      requestId: this.currentMeta?.requestId,
      context: this.currentMeta?.context,
      data: { reason },
    });
  }

  /**
   * Emit error_received event
   */
  private emitError(message: string, errorCode?: string): void {
    this.emitToBus({
      type: "error_received",
      timestamp: Date.now(),
      source: "driver",
      category: "stream",
      intent: "notification",
      requestId: this.currentMeta?.requestId,
      context: this.currentMeta?.context,
      data: { message, errorCode },
    });
  }

  /**
   * Emit event to EventBus
   */
  private emitToBus(event: DriveableEvent): void {
    if (this.producer) {
      this.producer.emit(event);
    }
  }

  /**
   * Clean up pending request subscription
   */
  private cleanupPendingRequest(): void {
    if (this.pendingSubscription) {
      this.pendingSubscription.unsubscribe();
      this.pendingSubscription = null;
    }
    if (this.pendingRequest$) {
      this.pendingRequest$.complete();
      this.pendingRequest$ = null;
    }
  }

  /**
   * Complete pending request (cancels timeout)
   */
  private completePendingRequest(): void {
    if (this.pendingRequest$) {
      this.pendingRequest$.complete();
      this.pendingRequest$ = null;
    }
    if (this.pendingSubscription) {
      this.pendingSubscription.unsubscribe();
      this.pendingSubscription = null;
    }
  }
}

/**
 * ClaudeDriverFactory - Factory for creating ClaudeDriver instances
 */
export class ClaudeDriverFactory implements DriverFactory {
  readonly name = "ClaudeDriverFactory";

  /**
   * Create a ClaudeDriver instance
   */
  createDriver(options: CreateDriverOptions): Driver {
    return new ClaudeDriver(options);
  }

  /**
   * Warmup the driver (pre-validate config)
   */
  async warmup(config: DriverConfig): Promise<void> {
    // Validate API key
    if (!config.apiKey) {
      throw new Error("API key is required");
    }
    logger.info("ClaudeDriverFactory warmup complete");
  }
}

/**
 * Create a ClaudeDriverFactory instance
 */
export function createClaudeDriverFactory(): DriverFactory {
  return new ClaudeDriverFactory();
}
