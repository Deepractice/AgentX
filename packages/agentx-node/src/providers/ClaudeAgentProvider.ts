/**
 * ClaudeAgentProvider
 *
 * Adapts @anthropic-ai/claude-agent-sdk to AgentEvent standard.
 * This is the Node.js-specific implementation.
 *
 * Performance Optimization:
 * - Uses Claude SDK's Streaming Input Mode (prompt: AsyncIterable)
 * - Process starts once and stays alive for entire session
 * - First message: ~6-7s (process startup)
 * - Subsequent messages: ~1-2s (3-5x faster!)
 */

import { query, type SDKMessage, type Query } from "@anthropic-ai/claude-agent-sdk";
import type { AgentProvider, AgentEventBus } from "@deepractice-ai/agentx-core";
import type { AgentConfig, AgentEvent, UserMessageEvent } from "@deepractice-ai/agentx-api";
import { AgentConfigError } from "@deepractice-ai/agentx-api";
import { observableToAsyncIterable } from "../utils/observableToAsyncIterable";

export class ClaudeAgentProvider implements AgentProvider {
  readonly sessionId: string;
  providerSessionId: string | null = null; // Claude SDK's real session ID
  private abortController: AbortController;
  private config: AgentConfig;
  private currentQuery: Query | null = null;
  private eventBus: AgentEventBus | null = null;

  constructor(config: AgentConfig) {
    this.config = config;
    this.sessionId = this.generateSessionId();
    this.abortController = new AbortController();
  }

  /**
   * Connect to AgentEventBus and start Claude SDK in streaming mode
   *
   * This is called once when Agent is created.
   * Claude SDK process starts here and stays alive.
   */
  async connect(eventBus: AgentEventBus): Promise<void> {
    this.eventBus = eventBus;

    // Start Claude SDK in Streaming Input Mode (process starts ONCE)
    this.currentQuery = query({
      prompt: this.createMessageStream(eventBus) as any,  // Type mismatch between our Message and SDK's APIUserMessage
      options: {
        model: this.config.model,
        systemPrompt: this.config.systemPrompt,
        maxThinkingTokens: this.config.maxThinkingTokens,
        abortController: this.abortController,
        mcpServers: this.transformMcpConfig(this.config.mcp),
        includePartialMessages: true,
        // Resume with provider's session ID (SDK's real session ID)
        resume: this.providerSessionId || undefined,
        // Pass API credentials to Claude Code subprocess via env
        // Must include process.env to preserve PATH and other system variables
        env: {
          ...process.env,
          ANTHROPIC_API_KEY: this.config.apiKey,
          ...(this.config.baseUrl ? { ANTHROPIC_BASE_URL: this.config.baseUrl } : {}),
        },
        // Capture stderr output for debugging
        stderr: (data: string) => {
          console.error('[ClaudeAgentProvider stderr]', data);
        },
      },
    });

    // Start listening to Claude SDK responses
    this.startListening();
  }

  /**
   * Create AsyncIterable message stream for Claude SDK
   * Converts AgentEventBus.outbound() → AsyncIterable<SDKUserMessage>
   */
  private async *createMessageStream(eventBus: AgentEventBus) {
    // Subscribe to outbound (UserMessageEvent) and convert to AsyncIterable
    const outbound$ = eventBus.outbound();
    for await (const userEvent of observableToAsyncIterable<UserMessageEvent>(outbound$)) {
      // Convert to SDKUserMessage format
      yield {
        type: 'user' as const,
        message: userEvent.message.content as any,  // Type mismatch between our Message and SDK's APIUserMessage
        parent_tool_use_id: null,
        session_id: this.sessionId,
      };
    }
  }

  /**
   * Listen to Claude SDK responses and emit to AgentEventBus
   * This runs in the background for the lifetime of the provider
   */
  private async startListening(): Promise<void> {
    if (!this.currentQuery || !this.eventBus) {
      console.error('[ClaudeAgentProvider] Cannot start listening: query or eventBus is null');
      return;
    }

    try {
      for await (const sdkMessage of this.currentQuery) {
        const agentEvent = this.transformToAgentEvent(sdkMessage);
        if (agentEvent) {
          // Capture provider session ID from system init event
          if (agentEvent.type === "system" && agentEvent.subtype === "init") {
            this.providerSessionId = agentEvent.sessionId;
          }

          // Emit to AgentEventBus (inbound)
          this.eventBus.emit(agentEvent);
        }
      }
    } catch (error) {
      console.error('[ClaudeAgentProvider] Error in startListening:', error);

      // Emit error event to AgentEventBus
      if (this.eventBus) {
        this.eventBus.emit({
          type: "result",
          subtype: "error_during_execution",
          uuid: this.generateId(),
          sessionId: this.sessionId,
          durationMs: 0,
          durationApiMs: 0,
          numTurns: 0,
          totalCostUsd: 0,
          usage: {
            input: 0,
            output: 0,
            cacheRead: 0,
            cacheWrite: 0,
          },
          error: error instanceof Error ? error : new Error(String(error)),
          timestamp: Date.now(),
        });
      }
    } finally {
      this.currentQuery = null;
    }
  }

  validateConfig(config: AgentConfig): void {
    if (!config.apiKey) {
      throw new AgentConfigError("apiKey is required", "apiKey");
    }
    if (!config.model) {
      throw new AgentConfigError("model is required", "model");
    }
  }

  abort(): void {
    this.abortController.abort();
    this.abortController = new AbortController();
  }

  async destroy(): Promise<void> {
    this.abort();
    this.currentQuery = null;
    this.eventBus = null;
  }

  /**
   * Transform Claude SDK message to AgentEvent
   * This is where the adaptation happens - from SDK format to our standard
   */
  private transformToAgentEvent(sdkMessage: SDKMessage): AgentEvent | null {
    const uuid =
      sdkMessage.uuid ?? `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const timestamp = Date.now();

    switch (sdkMessage.type) {
      case "user":
        return {
          type: "user",
          uuid,
          sessionId: this.sessionId,
          message: {
            id: uuid,
            role: "user",
            content: typeof sdkMessage.message === "string" ? sdkMessage.message : "",
            timestamp,
          },
          timestamp,
        };

      case "assistant":
        return {
          type: "assistant",
          uuid,
          sessionId: this.sessionId,
          message: {
            id: uuid,
            role: "assistant",
            content: (sdkMessage.message as any).content ?? [],
            timestamp,
          },
          timestamp,
        };

      case "stream_event":
        // Map SDK stream event to our format
        const streamEvent = sdkMessage.event;
        return {
          type: "stream_event",
          uuid,
          sessionId: this.sessionId,
          streamEventType: streamEvent.type as any, // TODO: proper type mapping
          delta: streamEvent.type === "content_block_delta" ? streamEvent.delta : undefined,
          index: streamEvent.type === "content_block_start" ? streamEvent.index : undefined,
          timestamp,
        };

      case "result":
        if (sdkMessage.subtype === "success") {
          return {
            type: "result",
            subtype: "success",
            uuid,
            sessionId: this.sessionId,
            durationMs: sdkMessage.duration_ms,
            durationApiMs: sdkMessage.duration_api_ms,
            numTurns: sdkMessage.num_turns,
            result: (sdkMessage as any).result ?? "",
            totalCostUsd: sdkMessage.total_cost_usd,
            usage: {
              input: sdkMessage.usage.input_tokens,
              output: sdkMessage.usage.output_tokens,
              cacheWrite: sdkMessage.usage.cache_creation_input_tokens ?? 0,
              cacheRead: sdkMessage.usage.cache_read_input_tokens ?? 0,
            },
            timestamp,
          };
        } else {
          // Filter to only allowed error subtypes
          const subtype =
            sdkMessage.subtype === "error_max_turns" ? "error_max_turns" : "error_during_execution";
          return {
            type: "result",
            subtype,
            uuid,
            sessionId: this.sessionId,
            durationMs: sdkMessage.duration_ms,
            durationApiMs: sdkMessage.duration_api_ms,
            numTurns: sdkMessage.num_turns,
            totalCostUsd: sdkMessage.total_cost_usd,
            usage: {
              input: sdkMessage.usage.input_tokens,
              output: sdkMessage.usage.output_tokens,
              cacheWrite: sdkMessage.usage.cache_creation_input_tokens ?? 0,
              cacheRead: sdkMessage.usage.cache_read_input_tokens ?? 0,
            },
            error: new Error(`Agent error: ${sdkMessage.subtype}`),
            timestamp,
          };
        }

      case "system":
        if (sdkMessage.subtype === "init") {
          return {
            type: "system",
            subtype: "init",
            uuid,
            sessionId: sdkMessage.session_id, // Use SDK's real session ID
            model: sdkMessage.model,
            tools: sdkMessage.tools,
            cwd: sdkMessage.cwd,
            timestamp,
          };
        }
        // Ignore other system messages (e.g., compact_boundary)
        return null;

      default:
        // Unknown message type
        return null;
    }
  }

  private transformMcpConfig(mcp?: AgentConfig["mcp"]) {
    if (!mcp || !mcp.servers) {
      return undefined;
    }

    const result: Record<string, any> = {};
    for (const [name, serverConfig] of Object.entries(mcp.servers)) {
      result[name] = serverConfig;
    }
    return result;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
