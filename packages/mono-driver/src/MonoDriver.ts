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

import type { UserMessage } from "@agentxjs/core/agent";
import type { Driver, DriverState, DriverStreamEvent } from "@agentxjs/core/driver";
import { createMediaResolver, passthrough, textExtract } from "@agentxjs/core/media";
import type { Session } from "@agentxjs/core/session";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createMistral } from "@ai-sdk/mistral";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createXai } from "@ai-sdk/xai";
import type { ToolSet } from "ai";
import { stepCountIs, streamText } from "ai";
import { createLogger } from "commonxjs/logger";
import {
  createEvent,
  toStopReason,
  toVercelMessages,
  toVercelTools,
  toVercelUserContent,
} from "./converters";
import type { MonoDriverConfig, MonoProvider, OpenAICompatibleConfig } from "./types";

const logger = createLogger("mono-driver/MonoDriver");

/**
 * MonoDriver - Driver implementation using Vercel AI SDK
 */
export class MonoDriver implements Driver {
  readonly name = "MonoDriver";
  readonly supportedProtocols = ["anthropic", "openai"] as const;

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
    this.provider = config.provider ?? "anthropic";
    this.maxSteps = config.maxSteps ?? 10;
    this.compatibleConfig = config.compatibleConfig;
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
      instanceId: this.config.instanceId,
      provider: this.provider,
      model: this.config.model,
      baseUrl: this.config.baseUrl,
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

    logger.info("Disposing MonoDriver", { instanceId: this.config.instanceId });

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

      // Create media resolver with current model + baseUrl
      const model = this.config.model ?? this.getDefaultModel();
      const mediaResolver = createMediaResolver(
        getMediaStrategies(this.provider, model, this.config.baseUrl)
      );

      // Resolve file parts in history messages (same as current message)
      for (const msg of history) {
        if (msg.subtype === "user" && typeof msg.content !== "string") {
          (msg as any).content = await mediaResolver.resolve(
            msg.content as import("@agentxjs/core/agent").UserContentPart[]
          );
        }
      }

      // Convert to Vercel AI SDK format
      const messages = toVercelMessages(history);

      // Resolve file parts (extract text from unsupported types, passthrough supported ones)
      const isMultipart = typeof message.content !== "string";
      if (isMultipart) {
        const parts = message.content as import("@agentxjs/core/agent").UserContentPart[];
        logger.info("[MediaResolver] Input parts", {
          count: parts.length,
          types: parts.map((p) => `${p.type}:${"mediaType" in p ? (p as any).mediaType : "n/a"}`),
        });
      }

      const resolvedContent =
        typeof message.content === "string"
          ? message.content
          : await mediaResolver.resolve(message.content);

      if (isMultipart) {
        const resolved = resolvedContent as import("@agentxjs/core/agent").UserContentPart[];
        logger.info("[MediaResolver] Resolved parts", {
          count: resolved.length,
          types: resolved.map((p) => p.type),
        });
      }

      // Add current user message
      messages.push({
        role: "user",
        content: toVercelUserContent(resolvedContent),
      });

      logger.debug("Sending message to LLM", {
        provider: this.provider,
        messageCount: messages.length,
        instanceId: this.config.instanceId,
      });

      // Build three-layer system prompt:
      // Layer 1: System Prompt (fixed, from Image config)
      // Layer 2: Role Context (dynamic, RoleX projection)
      // Layer 3: Message Context (conversation history, already in messages)
      const systemPrompt = await this.buildSystemPrompt();

      // Call Vercel AI SDK (v6)
      const result = streamText({
        model: this.getModel(),
        system: systemPrompt,
        messages,
        tools: this.getTools(),
        stopWhen: stepCountIs(this.maxSteps),
        abortSignal: this.abortController.signal,
      });

      // Track state for event conversion
      let messageStartEmitted = false;
      // Track tool calls in current step for correct message ordering.
      // AI SDK emits: tool-call → tool-result → finish-step
      // Engine needs: AssistantMessage(with tool-calls) BEFORE ToolResultMessage
      // So we inject message_stop before the first tool-result in each step.
      let hasToolCallsInStep = false;

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
            hasToolCallsInStep = false;
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
            hasToolCallsInStep = true;
            yield createEvent("tool_use_stop", {
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              input: part.input as Record<string, unknown>,
            });
            break;

          case "tool-result":
            // Flush AssistantMessage before first tool-result in this step.
            // Ensures correct ordering: Assistant(tool-calls) → ToolResult
            if (hasToolCallsInStep) {
              yield createEvent("message_stop", {
                stopReason: toStopReason("tool-calls"),
              });
              hasToolCallsInStep = false;
            }
            yield createEvent("tool_result", {
              toolCallId: part.toolCallId,
              result: part.output,
              isError: false,
            });
            break;

          case "tool-error":
            if (hasToolCallsInStep) {
              yield createEvent("message_stop", {
                stopReason: toStopReason("tool-calls"),
              });
              hasToolCallsInStep = false;
            }
            yield createEvent("tool_result", {
              toolCallId: part.toolCallId,
              result: part.error,
              isError: true,
            });
            break;

          case "finish-step":
            // Emit usage data for this step
            if (part.usage) {
              yield createEvent("message_delta", {
                usage: {
                  inputTokens: part.usage.inputTokens ?? 0,
                  outputTokens: part.usage.outputTokens ?? 0,
                },
              });
            }
            // Reset for next step so start-step emits a new message_start
            messageStartEmitted = false;
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

  /**
   * Convert config tools to Vercel AI SDK ToolSet.
   * Tools are pre-merged by the runtime before being passed to the driver.
   */
  private getTools(): ToolSet | undefined {
    const tools = this.config.tools;
    if (!tools || tools.length === 0) return undefined;
    return toVercelTools(tools);
  }

  /**
   * Build the three-layer system prompt.
   *
   * Layer 1: System Prompt (fixed, from Image config)
   * Layer 2: Context (dynamic, refreshed each turn — e.g. RoleX role projection)
   * Layer 3: Messages (conversation history, in messages array)
   */
  private async buildSystemPrompt(): Promise<string | undefined> {
    const parts: string[] = [];

    // Layer 1: System Prompt (fixed, from Image config)
    if (this.config.systemPrompt) {
      parts.push(`<system>\n${this.config.systemPrompt}\n</system>`);
    }

    // Layer 2: Context (cognitive context from ContextProvider)
    if (this.config.context) {
      // Schema — fixed cognitive framework
      const schema = this.config.context.schema;
      if (schema) {
        parts.push(`<instructions>\n${schema}\n</instructions>`);
      }

      // Projection — dynamic state, refreshed each turn
      const projection = await this.config.context.project();
      if (projection) {
        parts.push(`<context>\n${projection}\n</context>`);
      }
    }

    return parts.length > 0 ? parts.join("\n\n") : undefined;
  }

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
          throw new Error("openai-compatible provider requires compatibleConfig in options");
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

// ============================================================================
// Provider Media Strategies
// ============================================================================

/** All text-based types we can decode to inline text */
const TEXT_EXTRACTABLE = [
  "text/*",
  "application/json",
  "application/xml",
  "application/javascript",
];

/**
 * Check if a model/baseUrl combination supports PDF via native `document` blocks.
 *
 * Only Anthropic's own API and Google support this.
 * Third-party APIs using Anthropic protocol (Kimi, Doubao, Ark, etc.) do NOT,
 * even though they use the same protocol.
 *
 * Detection priority: model name → baseUrl → provider
 */
function supportsPdfNative(provider: MonoProvider, model?: string, baseUrl?: string): boolean {
  // 1. Model name check (most reliable when available)
  if (model) {
    if (model.startsWith("claude-")) return true;
    if (model.startsWith("gemini-")) return true;
    // Known non-native models
    if (model.startsWith("kimi-")) return false;
    if (model.startsWith("doubao-")) return false;
    if (model.startsWith("deepseek-")) return false;
    if (model.startsWith("glm-")) return false;
    if (model.startsWith("minimax-")) return false;
  }

  // 2. BaseUrl check (catches empty model case)
  if (baseUrl) {
    if (baseUrl.includes("anthropic.com")) return true;
    if (baseUrl.includes("googleapis.com")) return true;
    // Known third-party proxies — no native PDF support
    if (baseUrl.includes("volces.com")) return false;
    if (baseUrl.includes("sholoopai")) return false;
  }

  // 3. Fall back to provider (protocol)
  return provider === "google";
}

/**
 * Get media strategies based on protocol, model, and baseUrl.
 *
 * - Images: always passthrough
 * - Text files: always textExtract (inline text)
 * - PDF: passthrough only for native-supporting providers
 */
function getMediaStrategies(provider: MonoProvider, model?: string, baseUrl?: string) {
  if (supportsPdfNative(provider, model, baseUrl)) {
    return [passthrough(["image/*", "application/pdf"]), textExtract(TEXT_EXTRACTABLE)];
  }

  return [
    passthrough(["image/*"]),
    textExtract(TEXT_EXTRACTABLE),
    // PDF not supported — will throw UnsupportedMediaTypeError
  ];
}
