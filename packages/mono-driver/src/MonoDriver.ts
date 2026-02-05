/**
 * MonoDriver - Unified Cross-Platform Driver
 *
 * Implements the Driver interface using Vercel AI SDK.
 * Supports multiple LLM providers (Anthropic, OpenAI, Google).
 *
 * ```
 *         UserMessage
 *              │
 *              ▼
 *     ┌─────────────────┐
 *     │   MonoDriver    │
 *     │                 │
 *     │   receive()     │──► AsyncIterable<DriverStreamEvent>
 *     │       │         │
 *     │       ▼         │
 *     │  Vercel AI SDK  │
 *     └─────────────────┘
 *              │
 *              ▼
 *         LLM Provider
 *     (Anthropic/OpenAI/...)
 * ```
 */

import { streamText, stepCountIs } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createXai } from "@ai-sdk/xai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createMistral } from "@ai-sdk/mistral";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type {
  Driver,
  DriverState,
  DriverStreamEvent,
} from "@agentxjs/core/driver";
import type { UserMessage } from "@agentxjs/core/agent";
import type { Session } from "@agentxjs/core/session";
import { createLogger } from "commonxjs/logger";
import type { MonoDriverConfig, MonoProvider, OpenAICompatibleConfig } from "./types";
import { toVercelMessages, toStopReason, createEvent } from "./converters";

const logger = createLogger("mono-driver/MonoDriver");

/**
 * MonoDriver - Driver implementation using Vercel AI SDK
 */
export class MonoDriver implements Driver {
  readonly name = "MonoDriver";

  private _sessionId: string | null = null;
  private _state: DriverState = "idle";
  private abortController: AbortController | null = null;

  private readonly config: MonoDriverConfig;
  private readonly session?: Session;
  private readonly provider: MonoProvider;
  private readonly maxSteps: number;
  private readonly compatibleConfig?: OpenAICompatibleConfig;

  constructor(config: MonoDriverConfig) {
    this.config = config;
    this.session = config.session;
    this.provider = config.options?.provider ?? "anthropic";
    this.maxSteps = config.options?.maxSteps ?? 10;
    this.compatibleConfig = config.options?.compatibleConfig;
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

  async initialize(): Promise<void> {
    if (this._state !== "idle") {
      throw new Error(`Cannot initialize: Driver is in "${this._state}" state`);
    }

    logger.info("Initializing MonoDriver", {
      agentId: this.config.agentId,
      provider: this.provider,
    });

    // Generate a session ID for tracking
    this._sessionId = `mono_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Notify session ID captured
    this.config.onSessionIdCaptured?.(this._sessionId);

    logger.info("MonoDriver initialized", { sessionId: this._sessionId });
  }

  async dispose(): Promise<void> {
    if (this._state === "disposed") {
      return;
    }

    logger.info("Disposing MonoDriver", { agentId: this.config.agentId });

    // Abort any ongoing request
    this.abortController?.abort();
    this.abortController = null;

    this._state = "disposed";
    logger.info("MonoDriver disposed");
  }

  // ============================================================================
  // Core Methods
  // ============================================================================

  async *receive(message: UserMessage): AsyncIterable<DriverStreamEvent> {
    if (this._state === "disposed") {
      throw new Error("Cannot receive: Driver is disposed");
    }

    if (this._state === "active") {
      throw new Error("Cannot receive: Driver is already processing a message");
    }

    this._state = "active";
    this.abortController = new AbortController();

    try {
      // Get history from Session
      const history = this.session ? await this.session.getMessages() : [];

      // Convert to Vercel AI SDK format
      const messages = toVercelMessages(history);

      // Add current user message
      messages.push({
        role: "user",
        content:
          typeof message.content === "string"
            ? message.content
            : message.content.map((part) => {
                if ("text" in part) return { type: "text" as const, text: part.text };
                return { type: "text" as const, text: String(part) };
              }),
      });

      logger.debug("Sending message to LLM", {
        provider: this.provider,
        messageCount: messages.length,
        agentId: this.config.agentId,
      });

      // Call Vercel AI SDK (v6)
      const result = streamText({
        model: this.getModel(),
        system: this.config.systemPrompt,
        messages,
        stopWhen: stepCountIs(this.maxSteps),
        abortSignal: this.abortController.signal,
      });

      // Track state for event conversion
      let messageStartEmitted = false;

      // Process fullStream (AI SDK v6 event types)
      for await (const part of result.fullStream) {
        if (this.abortController?.signal.aborted) {
          yield createEvent("interrupted", { reason: "user" });
          break;
        }

        switch (part.type) {
          case "start":
          case "start-step":
            if (!messageStartEmitted) {
              const messageId = `msg_${Date.now()}`;
              const model = this.config.model ?? this.getDefaultModel();
              yield createEvent("message_start", { messageId, model });
              messageStartEmitted = true;
            }
            break;

          case "text-delta":
            yield createEvent("text_delta", { text: part.text });
            break;

          case "tool-input-start":
            yield createEvent("tool_use_start", {
              toolCallId: part.id,
              toolName: part.toolName,
            });
            break;

          case "tool-input-delta":
            yield createEvent("input_json_delta", {
              partialJson: part.delta,
            });
            break;

          case "tool-call":
            yield createEvent("tool_use_stop", {
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              input: part.input as Record<string, unknown>,
            });
            break;

          case "tool-result":
            yield createEvent("tool_result", {
              toolCallId: part.toolCallId,
              result: part.output,
              isError: false,
            });
            break;

          case "tool-error":
            yield createEvent("tool_result", {
              toolCallId: part.toolCallId,
              result: part.error,
              isError: true,
            });
            break;

          case "finish":
            yield createEvent("message_stop", {
              stopReason: toStopReason(part.finishReason),
            });
            break;

          case "error":
            yield createEvent("error", {
              message: String(part.error),
              errorCode: "stream_error",
            });
            break;
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        yield createEvent("interrupted", { reason: "user" });
      } else {
        yield createEvent("error", {
          message: error instanceof Error ? error.message : String(error),
          errorCode: "runtime_error",
        });
        throw error;
      }
    } finally {
      this._state = "idle";
      this.abortController = null;
    }
  }

  interrupt(): void {
    if (this._state !== "active") {
      logger.debug("Interrupt called but no active operation");
      return;
    }

    logger.debug("Interrupting MonoDriver");
    this.abortController?.abort();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private getModel() {
    const modelId = this.config.model ?? this.getDefaultModel();
    const { apiKey } = this.config;
    const baseURL = this.getBaseURL();

    switch (this.provider) {
      case "anthropic":
        return createAnthropic({ apiKey, baseURL })(modelId);
      case "openai":
        return createOpenAI({ apiKey, baseURL })(modelId);
      case "google":
        return createGoogleGenerativeAI({ apiKey, baseURL })(modelId);
      case "xai":
        return createXai({ apiKey, baseURL })(modelId);
      case "deepseek":
        return createDeepSeek({ apiKey, baseURL })(modelId);
      case "mistral":
        return createMistral({ apiKey, baseURL })(modelId);
      case "openai-compatible": {
        if (!this.compatibleConfig) {
          throw new Error(
            "openai-compatible provider requires compatibleConfig in options"
          );
        }
        const provider = createOpenAICompatible({
          name: this.compatibleConfig.name,
          baseURL: this.compatibleConfig.baseURL,
          apiKey: this.compatibleConfig.apiKey ?? apiKey,
        });
        return provider.chatModel(modelId);
      }
      default:
        return createAnthropic({ apiKey, baseURL })(modelId);
    }
  }

  /**
   * Get the base URL for the provider SDK.
   *
   * Provider SDKs expect baseURL to include the version path (e.g. /v1).
   * DriverConfig.baseUrl is the API root without version path.
   * This method bridges the gap.
   */
  private getBaseURL(): string | undefined {
    if (!this.config.baseUrl) return undefined;
    const base = this.config.baseUrl.replace(/\/+$/, "");
    if (base.endsWith("/v1")) return base;
    return `${base}/v1`;
  }

  private getDefaultModel(): string {
    switch (this.provider) {
      case "anthropic":
        return "claude-sonnet-4-20250514";
      case "openai":
        return "gpt-4o";
      case "google":
        return "gemini-2.0-flash";
      case "xai":
        return "grok-3";
      case "deepseek":
        return "deepseek-chat";
      case "mistral":
        return "mistral-large-latest";
      case "openai-compatible":
        return "default";
      default:
        return "claude-sonnet-4-20250514";
    }
  }
}

/**
 * Create a MonoDriver instance
 */
export function createMonoDriver(config: MonoDriverConfig): Driver {
  return new MonoDriver(config);
}
