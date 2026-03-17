/**
 * Driver Types - LLM Communication Layer
 *
 * Driver is the bridge between AgentX and external LLM (Claude, OpenAI, etc.)
 *
 * ```
 *                    AgentX
 *                      │
 *         receive()    │    AsyncIterable<StreamEvent>
 *         ─────────►   │   ◄─────────────────────────
 *                      │
 *              ┌───────────────┐
 *              │    Driver     │
 *              │               │
 *              │  UserMessage  │
 *              │      ↓        │
 *              │   [SDK call]  │
 *              │      ↓        │
 *              │  StreamEvent  │
 *              └───────────────┘
 *                      │
 *                      ▼
 *               External LLM
 *               (Claude SDK)
 * ```
 *
 * Key Design:
 * - Driver = single session communication (like Kimi SDK's Session)
 * - Clear input/output boundary (for recording/playback)
 * - Configuration defined by us (capability boundary)
 */

import type { UserMessage } from "../agent/types/message";
import type { LLMProtocol } from "../persistence/types";
import type { Session } from "../session/types";

// ============================================================================
// Tool Definition
// ============================================================================

/**
 * ToolDefinition - Defines a tool for LLM tool calling
 *
 * Tools are injected into the Driver via DriverConfig.tools.
 * The Driver passes tool schemas to the LLM and executes handlers
 * when the LLM requests a tool call.
 *
 * @example
 * ```typescript
 * const calculator: ToolDefinition = {
 *   name: "calculator",
 *   description: "Evaluates a math expression",
 *   parameters: {
 *     type: "object",
 *     properties: {
 *       expression: { type: "string", description: "e.g. '123 * 456'" },
 *     },
 *     required: ["expression"],
 *   },
 *   execute: async (params) => {
 *     const result = Function(`"use strict"; return (${params.expression})`)();
 *     return { result: String(result) };
 *   },
 * };
 * ```
 */
export interface ToolDefinition {
  /**
   * Tool name (unique identifier)
   */
  name: string;

  /**
   * Description of what the tool does (sent to LLM)
   */
  description?: string;

  /**
   * JSON Schema for the tool's input parameters
   */
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };

  /**
   * Function to execute when the LLM calls this tool
   */
  execute: (params: Record<string, unknown>) => Promise<unknown>;
}

// ============================================================================
// MCP Server Configuration
// ============================================================================

/**
 * Stdio transport — launches a local MCP server as a child process.
 */
export interface McpStdioServerConfig {
  /**
   * Command to run the MCP server
   */
  command: string;

  /**
   * Command arguments
   */
  args?: string[];

  /**
   * Environment variables for the process
   */
  env?: Record<string, string>;
}

/**
 * HTTP Streamable transport — connects to a remote MCP server over HTTP.
 */
export interface McpHttpServerConfig {
  /**
   * Transport type discriminator
   */
  type: "http";

  /**
   * URL of the remote MCP server
   */
  url: string;

  /**
   * Additional HTTP headers (e.g. Authorization)
   */
  headers?: Record<string, string>;
}

/**
 * MCP Server configuration.
 *
 * - Stdio: `{ command, args?, env? }` — local subprocess
 * - HTTP:  `{ transport: "http", url, headers? }` — remote server
 */
export type McpServerConfig = McpStdioServerConfig | McpHttpServerConfig;

// ============================================================================
// Stream Event (Lightweight)
// ============================================================================

/**
 * StopReason - Why the LLM stopped generating
 */
export type StopReason =
  | "end_turn"
  | "max_tokens"
  | "tool_use"
  | "stop_sequence"
  | "content_filter"
  | "error"
  | "other";

/**
 * StreamEvent - Lightweight event from Driver
 *
 * Only contains essential fields: type, timestamp, data
 * No source, category, intent, context (those are added by upper layers)
 */
export interface StreamEvent<T extends string = string, D = unknown> {
  readonly type: T;
  readonly timestamp: number;
  readonly data: D;
}

// Stream Event Types
export interface MessageStartEvent
  extends StreamEvent<
    "message_start",
    {
      messageId: string;
      model: string;
    }
  > {}

export interface MessageStopEvent
  extends StreamEvent<
    "message_stop",
    {
      stopReason: StopReason;
    }
  > {}

export interface TextDeltaEvent
  extends StreamEvent<
    "text_delta",
    {
      text: string;
    }
  > {}

export interface ToolUseStartEvent
  extends StreamEvent<
    "tool_use_start",
    {
      toolCallId: string;
      toolName: string;
    }
  > {}

export interface InputJsonDeltaEvent
  extends StreamEvent<
    "input_json_delta",
    {
      partialJson: string;
    }
  > {}

export interface ToolUseStopEvent
  extends StreamEvent<
    "tool_use_stop",
    {
      toolCallId: string;
      toolName: string;
      input: Record<string, unknown>;
    }
  > {}

export interface ToolResultEvent
  extends StreamEvent<
    "tool_result",
    {
      toolCallId: string;
      result: unknown;
      isError?: boolean;
    }
  > {}

export interface ErrorEvent
  extends StreamEvent<
    "error",
    {
      message: string;
      errorCode?: string;
    }
  > {}

export interface MessageDeltaEvent
  extends StreamEvent<
    "message_delta",
    {
      usage?: {
        inputTokens: number;
        outputTokens: number;
      };
    }
  > {}

export interface ThinkingDeltaEvent
  extends StreamEvent<
    "thinking_delta",
    {
      text: string;
    }
  > {}

export interface InterruptedEvent
  extends StreamEvent<
    "interrupted",
    {
      reason: "user" | "timeout" | "error";
    }
  > {}

/**
 * DriverStreamEvent - Union of all stream events from Driver
 */
export type DriverStreamEvent =
  | MessageStartEvent
  | MessageDeltaEvent
  | MessageStopEvent
  | TextDeltaEvent
  | ToolUseStartEvent
  | InputJsonDeltaEvent
  | ToolUseStopEvent
  | ToolResultEvent
  | ErrorEvent
  | ThinkingDeltaEvent
  | InterruptedEvent;

/**
 * DriverStreamEventType - String literal union of event types
 */
export type DriverStreamEventType = DriverStreamEvent["type"];

// Context — import and re-export from context module
import type { Context } from "../context/types";
export type { Context };

// ============================================================================
// SendOptions — per-request overridable fields
// ============================================================================

/**
 * SendOptions — fields that can be overridden per-request.
 *
 * These are passed with each send() call and merged with
 * the agent's base configuration at runtime.
 *
 * Classification rule: if changing the field does NOT break
 * conversation continuity, it belongs in SendOptions.
 */
export interface SendOptions {
  /** Override model for this request */
  model?: string;

  /** Override thinking depth for this request */
  thinking?: "disabled" | "low" | "medium" | "high";

  /** Override provider options for this request */
  providerOptions?: Record<string, unknown>;
}

// ============================================================================
// AgentContext — merged configuration consumed by Driver
// ============================================================================

/**
 * AgentContext — the final merged configuration object passed to Driver.
 *
 * Created by Runtime by merging:
 * - ImageRecord fields (static, from persistence)
 * - LLMProvider config (apiKey, baseUrl, default model)
 * - SendOptions (per-request overrides)
 * - Runtime-assembled tools and context
 *
 * This replaces DriverConfig as the primary configuration contract
 * between Runtime and Driver.
 */
export interface AgentContext {
  // === Provider Configuration ===

  /** API key for authentication */
  apiKey: string;

  /** Base URL for API endpoint */
  baseUrl?: string;

  /** Model identifier */
  model?: string;

  /** Request timeout in milliseconds */
  timeout?: number;

  // === Agent Configuration ===

  /** Agent instance ID */
  instanceId: string;

  /** System prompt (Layer 1 — fixed) */
  systemPrompt?: string;

  /** Dynamic context provider (Layer 2 — refreshed each turn) */
  context?: Context;

  /** Current working directory for tool execution */
  cwd?: string;

  /** MCP servers configuration */
  mcpServers?: Record<string, McpServerConfig>;

  /** Tool definitions for LLM tool calling */
  tools?: ToolDefinition[];

  /** Thinking/reasoning depth */
  thinking?: "disabled" | "low" | "medium" | "high";

  /** Provider-specific options */
  providerOptions?: Record<string, unknown>;

  // === Session Configuration ===

  /** Session for message history access */
  session?: Session;

  /** Session ID to resume */
  resumeSessionId?: string;

  /** Callback when SDK session ID is captured */
  onSessionIdCaptured?: (sessionId: string) => void;
}

// ============================================================================
// CreateDriver Configuration
// ============================================================================

// ============================================================================
// Driver State
// ============================================================================

/**
 * DriverState - Current state of the Driver
 *
 * - idle: Ready to receive messages
 * - active: Currently processing a message
 * - disposed: Driver has been disposed, cannot be used
 */
export type DriverState = "idle" | "active" | "disposed";

// ============================================================================
// Driver Interface
// ============================================================================

/**
 * Driver - LLM Communication Interface
 *
 * Responsible for a single session's communication with LLM.
 * Similar to Kimi SDK's Session concept.
 *
 * Lifecycle:
 * 1. createDriver(config) → Driver instance
 * 2. driver.initialize() → Start SDK, MCP servers
 * 3. driver.receive(message) → Send message, get events
 * 4. driver.dispose() → Cleanup
 *
 * @example
 * ```typescript
 * const driver = createDriver(config);
 * await driver.initialize();
 *
 * const events = driver.receive(message);
 * for await (const event of events) {
 *   if (event.type === "text_delta") {
 *     console.log(event.data.text);
 *   }
 * }
 *
 * await driver.dispose();
 * ```
 */
export interface Driver {
  /**
   * Driver name (for identification and logging)
   */
  readonly name: string;

  /**
   * Supported LLM API protocols
   *
   * Declares which protocols this driver can handle.
   * Used by Runtime to validate that the driver is compatible
   * with the configured LLM provider's protocol.
   *
   * - MonoDriver (Vercel AI SDK): ["anthropic", "openai"]
   * - ClaudeDriver (Anthropic SDK): ["anthropic"]
   */
  readonly supportedProtocols: readonly LLMProtocol[];

  /**
   * SDK Session ID (available after first message)
   */
  readonly sessionId: string | null;

  /**
   * Current state
   */
  readonly state: DriverState;

  /**
   * Receive a user message and return stream of events
   *
   * @param message - User message to send
   * @param options - Per-request overrides (model, thinking, providerOptions)
   * @returns AsyncIterable of stream events
   */
  receive(message: UserMessage, options?: SendOptions): AsyncIterable<DriverStreamEvent>;

  /**
   * Interrupt current operation
   *
   * Stops the current receive() operation gracefully.
   * The AsyncIterable will emit an "interrupted" event and complete.
   */
  interrupt(): void;

  /**
   * Initialize the Driver
   *
   * Starts SDK subprocess, MCP servers, etc.
   * Must be called before receive().
   */
  initialize(): Promise<void>;

  /**
   * Dispose and cleanup resources
   *
   * Stops SDK subprocess, MCP servers, etc.
   * Driver cannot be used after dispose().
   */
  dispose(): Promise<void>;
}

// ============================================================================
// CreateDriver Function Type
// ============================================================================

/**
 * CreateDriver - Factory function type for creating Driver instances
 *
 * Each implementation package exports a function of this type.
 *
 * @typeParam TOptions - Driver-specific options merged with AgentContext
 *
 * @example
 * ```typescript
 * // @agentxjs/mono-driver
 * export const createMonoDriver: CreateDriver<MonoDriverOptions> = (config) => {
 *   return new MonoDriver(config);
 * };
 * ```
 */
export type CreateDriver<TOptions = {}> = (config: AgentContext & TOptions) => Driver;
