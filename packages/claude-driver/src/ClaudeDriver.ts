/**
 * ClaudeDriver - Claude SDK Driver Implementation
 *
 * Implements the new Driver interface with clear input/output boundaries:
 * - receive(message) returns AsyncIterable<DriverStreamEvent>
 * - No EventBus dependency
 * - Single session communication
 *
 * ```
 *         UserMessage
 *              │
 *              ▼
 *     ┌─────────────────┐
 *     │   ClaudeDriver   │
 *     │                  │
 *     │   receive()      │──► AsyncIterable<DriverStreamEvent>
 *     │       │          │
 *     │       ▼          │
 *     │   SDK Query      │
 *     └─────────────────┘
 *              │
 *              ▼
 *        Claude SDK
 * ```
 */

import type { UserMessage } from "@agentxjs/core/agent";
import type {
  Driver,
  DriverConfig,
  DriverState,
  DriverStreamEvent,
  StopReason,
} from "@agentxjs/core/driver";
import type { SDKMessage, SDKPartialAssistantMessage } from "@anthropic-ai/claude-agent-sdk";
import { createLogger } from "commonxjs/logger";
import { Subject } from "rxjs";
import { buildSDKUserMessage } from "./helpers";
import { SDKQueryLifecycle } from "./SDKQueryLifecycle";

const logger = createLogger("claude-driver/ClaudeDriver");

// ============================================================================
// ClaudeDriver-specific Options
// ============================================================================

/**
 * ClaudeDriver-specific options
 *
 * These options are specific to the Claude SDK and are passed via
 * the `options` field of DriverConfig.
 *
 * @example
 * ```typescript
 * // Zero-config: claudeCodePath is auto-resolved from installed package
 * const config: DriverConfig<ClaudeDriverOptions> = {
 *   apiKey: "...",
 *   agentId: "my-agent",
 * };
 *
 * // Custom path (optional, only if needed)
 * const config: DriverConfig<ClaudeDriverOptions> = {
 *   apiKey: "...",
 *   agentId: "my-agent",
 *   options: {
 *     claudeCodePath: "/custom/path/to/claude",
 *   }
 * };
 * ```
 */
export interface ClaudeDriverOptions {
  /**
   * Path to Claude Code executable
   *
   * If not provided, will automatically resolve from the installed
   * `@anthropic-ai/claude-code` package (zero-config).
   *
   * Only specify this when you need to use a custom Claude Code installation
   * (e.g., a different version or a custom binary location).
   */
  claudeCodePath?: string;

  /**
   * Maximum number of turns (agentic loops) before stopping
   *
   * Default is determined by the SDK.
   */
  maxTurns?: number;
}

/**
 * ClaudeDriverConfig - DriverConfig with ClaudeDriverOptions
 */
export type ClaudeDriverConfig = DriverConfig<ClaudeDriverOptions>;

/**
 * ClaudeDriver - Driver implementation for Claude SDK
 *
 * Implements the new Driver interface:
 * - receive() returns AsyncIterable<DriverStreamEvent>
 * - Clear input/output boundaries for recording/playback
 * - Single session communication
 */
export class ClaudeDriver implements Driver {
  readonly name = "ClaudeDriver";

  private _sessionId: string | null = null;
  private _state: DriverState = "idle";

  private readonly config: ClaudeDriverConfig;
  private queryLifecycle: SDKQueryLifecycle | null = null;

  // For interrupt handling
  private currentTurnSubject: Subject<DriverStreamEvent> | null = null;

  constructor(config: ClaudeDriverConfig) {
    this.config = config;
  }

  // ============================================================================
  // Driver Interface Properties
  // ============================================================================

  get sessionId(): string | null {
    return this._sessionId;
  }

  get state(): DriverState {
    return this._state;
  }

  // ============================================================================
  // Lifecycle Methods
  // ============================================================================

  /**
   * Initialize the Driver
   *
   * Starts SDK subprocess and MCP servers.
   * Must be called before receive().
   */
  async initialize(): Promise<void> {
    if (this._state !== "idle") {
      throw new Error(`Cannot initialize: Driver is in "${this._state}" state`);
    }

    logger.info("Initializing ClaudeDriver", { agentId: this.config.agentId });

    // SDKQueryLifecycle will be created lazily on first receive()
    // This allows configuration to be validated early without starting subprocess

    logger.info("ClaudeDriver initialized");
  }

  /**
   * Dispose and cleanup resources
   *
   * Stops SDK subprocess and MCP servers.
   * Driver cannot be used after dispose().
   */
  async dispose(): Promise<void> {
    if (this._state === "disposed") {
      return;
    }

    logger.info("Disposing ClaudeDriver", { agentId: this.config.agentId });

    // Complete any pending turn
    if (this.currentTurnSubject) {
      this.currentTurnSubject.complete();
      this.currentTurnSubject = null;
    }

    // Dispose SDK lifecycle
    if (this.queryLifecycle) {
      this.queryLifecycle.dispose();
      this.queryLifecycle = null;
    }

    this._state = "disposed";
    logger.info("ClaudeDriver disposed");
  }

  // ============================================================================
  // Core Methods
  // ============================================================================

  /**
   * Receive a user message and return stream of events
   *
   * This is the main method for communication.
   * Returns an AsyncIterable that yields DriverStreamEvent.
   *
   * @param message - User message to send
   * @returns AsyncIterable of stream events
   */
  async *receive(message: UserMessage): AsyncIterable<DriverStreamEvent> {
    if (this._state === "disposed") {
      throw new Error("Cannot receive: Driver is disposed");
    }

    if (this._state === "active") {
      throw new Error("Cannot receive: Driver is already processing a message");
    }

    this._state = "active";

    try {
      // Ensure SDK lifecycle is initialized
      await this.ensureLifecycle();

      // Create Subject for this turn's events
      const turnSubject = new Subject<DriverStreamEvent>();
      this.currentTurnSubject = turnSubject;

      // Track completion
      let isComplete = false;
      let turnError: Error | null = null;

      // Setup callbacks to convert SDK events to DriverStreamEvent
      this.setupTurnCallbacks(
        turnSubject,
        () => {
          isComplete = true;
        },
        (error) => {
          turnError = error;
          isComplete = true;
        }
      );

      // Build and send SDK message
      const sessionId = this._sessionId || "default";
      const sdkMessage = buildSDKUserMessage(message, sessionId);

      logger.debug("Sending message to Claude", {
        content:
          typeof message.content === "string" ? message.content.substring(0, 80) : "[structured]",
        agentId: this.config.agentId,
      });

      this.queryLifecycle!.send(sdkMessage);

      // Yield events from Subject
      yield* this.yieldFromSubject(
        turnSubject,
        () => isComplete,
        () => turnError
      );
    } finally {
      this._state = "idle";
      this.currentTurnSubject = null;
    }
  }

  /**
   * Interrupt current operation
   *
   * Stops the current receive() operation gracefully.
   * The AsyncIterable will emit an "interrupted" event and complete.
   */
  interrupt(): void {
    if (this._state !== "active") {
      logger.debug("Interrupt called but no active operation");
      return;
    }

    logger.debug("Interrupting ClaudeDriver");

    // Emit interrupted event
    if (this.currentTurnSubject) {
      this.currentTurnSubject.next({
        type: "interrupted",
        timestamp: Date.now(),
        data: { reason: "user" },
      });
      this.currentTurnSubject.complete();
    }

    // Interrupt SDK
    if (this.queryLifecycle) {
      this.queryLifecycle.interrupt();
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Ensure SDK lifecycle is initialized
   */
  private async ensureLifecycle(): Promise<void> {
    if (this.queryLifecycle?.initialized) {
      return;
    }

    // Create new lifecycle with driver-specific options
    this.queryLifecycle = new SDKQueryLifecycle(
      {
        apiKey: this.config.apiKey,
        baseUrl: this.config.baseUrl,
        model: this.config.model,
        systemPrompt: this.config.systemPrompt,
        cwd: this.config.cwd,
        resumeSessionId: this.config.resumeSessionId,
        mcpServers: this.config.mcpServers,
        // Pass driver-specific options
        claudeCodePath: this.config.options?.claudeCodePath,
      },
      {
        onSessionIdCaptured: (sessionId) => {
          this._sessionId = sessionId;
          this.config.onSessionIdCaptured?.(sessionId);
        },
      }
    );

    await this.queryLifecycle.initialize();
  }

  /**
   * Setup callbacks for a single turn
   */
  private setupTurnCallbacks(
    subject: Subject<DriverStreamEvent>,
    onComplete: () => void,
    onError: (error: Error) => void
  ): void {
    if (!this.queryLifecycle) return;

    // Context for tracking content block state
    const blockContext = {
      currentBlockType: null as "text" | "tool_use" | null,
      currentToolId: null as string | null,
      currentToolName: null as string | null,
      lastStopReason: null as string | null,
      accumulatedToolInput: "" as string,
    };

    // Update lifecycle callbacks for this turn
    this.queryLifecycle.setCallbacks({
      onStreamEvent: (msg: SDKMessage) => {
        const event = this.convertStreamEvent(msg as SDKPartialAssistantMessage, blockContext);
        if (event) {
          subject.next(event);
        }
      },

      onUserMessage: (msg: SDKMessage) => {
        const events = this.convertUserMessage(msg);
        for (const event of events) {
          subject.next(event);
        }
      },

      onResult: (msg: SDKMessage) => {
        const resultMsg = msg as { is_error?: boolean; error?: { message?: string } };

        if (resultMsg.is_error) {
          subject.next({
            type: "error",
            timestamp: Date.now(),
            data: {
              message: resultMsg.error?.message || "Unknown error",
              errorCode: "sdk_error",
            },
          });
        }

        subject.complete();
        onComplete();
      },

      onError: (error: Error) => {
        subject.next({
          type: "error",
          timestamp: Date.now(),
          data: {
            message: error.message,
            errorCode: "runtime_error",
          },
        });
        subject.complete();
        onError(error);
      },
    });
  }

  /**
   * Convert SDK stream_event to DriverStreamEvent
   */
  private convertStreamEvent(
    sdkMsg: SDKPartialAssistantMessage,
    blockContext: {
      currentBlockType: "text" | "tool_use" | null;
      currentToolId: string | null;
      currentToolName: string | null;
      lastStopReason: string | null;
      accumulatedToolInput: string;
    }
  ): DriverStreamEvent | null {
    const event = sdkMsg.event;
    const timestamp = Date.now();

    switch (event.type) {
      case "message_start":
        return {
          type: "message_start",
          timestamp,
          data: {
            messageId: event.message.id,
            model: event.message.model,
          },
        };

      case "content_block_start": {
        const contentBlock = event.content_block as { type: string; id?: string; name?: string };

        if (contentBlock.type === "text") {
          blockContext.currentBlockType = "text";
          // text_content_block_start is internal, don't emit
          return null;
        } else if (contentBlock.type === "tool_use") {
          blockContext.currentBlockType = "tool_use";
          blockContext.currentToolId = contentBlock.id || null;
          blockContext.currentToolName = contentBlock.name || null;
          blockContext.accumulatedToolInput = "";
          return {
            type: "tool_use_start",
            timestamp,
            data: {
              toolCallId: contentBlock.id || "",
              toolName: contentBlock.name || "",
            },
          };
        }
        return null;
      }

      case "content_block_delta": {
        const delta = event.delta as { type: string; text?: string; partial_json?: string };

        if (delta.type === "text_delta") {
          return {
            type: "text_delta",
            timestamp,
            data: { text: delta.text || "" },
          };
        } else if (delta.type === "input_json_delta") {
          blockContext.accumulatedToolInput += delta.partial_json || "";
          return {
            type: "input_json_delta",
            timestamp,
            data: { partialJson: delta.partial_json || "" },
          };
        }
        return null;
      }

      case "content_block_stop":
        if (blockContext.currentBlockType === "tool_use" && blockContext.currentToolId) {
          // Parse accumulated JSON
          let input: Record<string, unknown> = {};
          try {
            if (blockContext.accumulatedToolInput) {
              input = JSON.parse(blockContext.accumulatedToolInput);
            }
          } catch {
            logger.warn("Failed to parse tool input JSON", {
              input: blockContext.accumulatedToolInput,
            });
          }

          const event: DriverStreamEvent = {
            type: "tool_use_stop",
            timestamp,
            data: {
              toolCallId: blockContext.currentToolId,
              toolName: blockContext.currentToolName || "",
              input,
            },
          };

          // Reset block context
          blockContext.currentBlockType = null;
          blockContext.currentToolId = null;
          blockContext.currentToolName = null;
          blockContext.accumulatedToolInput = "";

          return event;
        }
        // Reset for text blocks too
        blockContext.currentBlockType = null;
        return null;

      case "message_delta": {
        const msgDelta = event.delta as { stop_reason?: string };
        if (msgDelta.stop_reason) {
          blockContext.lastStopReason = msgDelta.stop_reason;
        }
        return null;
      }

      case "message_stop":
        return {
          type: "message_stop",
          timestamp,
          data: {
            stopReason: this.mapStopReason(blockContext.lastStopReason),
          },
        };

      default:
        return null;
    }
  }

  /**
   * Convert SDK user message (contains tool_result)
   */
  private convertUserMessage(msg: SDKMessage): DriverStreamEvent[] {
    const events: DriverStreamEvent[] = [];
    const sdkMsg = msg as { message?: { content?: unknown[] } };

    if (!sdkMsg.message || !Array.isArray(sdkMsg.message.content)) {
      return events;
    }

    for (const block of sdkMsg.message.content) {
      if (block && typeof block === "object" && "type" in block && block.type === "tool_result") {
        const toolResultBlock = block as unknown as {
          tool_use_id: string;
          content: unknown;
          is_error?: boolean;
        };

        events.push({
          type: "tool_result",
          timestamp: Date.now(),
          data: {
            toolCallId: toolResultBlock.tool_use_id,
            result: toolResultBlock.content,
            isError: toolResultBlock.is_error,
          },
        });
      }
    }

    return events;
  }

  /**
   * Map SDK stop reason to our StopReason type
   */
  private mapStopReason(sdkReason: string | null): StopReason {
    switch (sdkReason) {
      case "end_turn":
        return "end_turn";
      case "max_tokens":
        return "max_tokens";
      case "tool_use":
        return "tool_use";
      case "stop_sequence":
        return "stop_sequence";
      default:
        return "other";
    }
  }

  /**
   * Yield events from Subject as AsyncIterable
   */
  private async *yieldFromSubject(
    subject: Subject<DriverStreamEvent>,
    _isComplete: () => boolean,
    getError: () => Error | null
  ): AsyncIterable<DriverStreamEvent> {
    const queue: DriverStreamEvent[] = [];
    let resolve: ((value: IteratorResult<DriverStreamEvent>) => void) | null = null;
    let done = false;

    const subscription = subject.subscribe({
      next: (value) => {
        if (resolve) {
          resolve({ value, done: false });
          resolve = null;
        } else {
          queue.push(value);
        }
      },
      complete: () => {
        done = true;
        if (resolve) {
          resolve({ value: undefined as unknown as DriverStreamEvent, done: true });
          resolve = null;
        }
      },
      error: (_err) => {
        done = true;
        // Error is handled via getError()
      },
    });

    try {
      while (!done || queue.length > 0) {
        const error = getError();
        if (error) {
          throw error;
        }

        if (queue.length > 0) {
          yield queue.shift()!;
        } else if (!done) {
          const result = await new Promise<IteratorResult<DriverStreamEvent>>((res) => {
            resolve = res;
          });

          if (!result.done) {
            yield result.value;
          }
        }
      }
    } finally {
      subscription.unsubscribe();
    }
  }
}

/**
 * CreateDriver function for ClaudeDriver
 *
 * Factory function that creates a ClaudeDriver instance.
 * Conforms to the CreateDriver type from @agentxjs/core/driver.
 *
 * @example
 * ```typescript
 * import { createClaudeDriver } from "@agentxjs/claude-driver";
 *
 * const driver = createClaudeDriver({
 *   apiKey: process.env.ANTHROPIC_API_KEY!,
 *   agentId: "my-agent",
 *   systemPrompt: "You are helpful",
 *   options: {
 *     claudeCodePath: "/usr/local/bin/claude",
 *   },
 * });
 *
 * await driver.initialize();
 *
 * for await (const event of driver.receive({ content: "Hello" })) {
 *   if (event.type === "text_delta") {
 *     process.stdout.write(event.data.text);
 *   }
 * }
 *
 * await driver.dispose();
 * ```
 */
export function createClaudeDriver(config: ClaudeDriverConfig): Driver {
  return new ClaudeDriver(config);
}
