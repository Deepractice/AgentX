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
 * MCP Server configuration
 *
 * Defines how to launch an MCP server process.
 */
export interface McpServerConfig {
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
export interface MessageStartEvent extends StreamEvent<
  "message_start",
  {
    messageId: string;
    model: string;
  }
> {}

export interface MessageStopEvent extends StreamEvent<
  "message_stop",
  {
    stopReason: StopReason;
  }
> {}

export interface TextDeltaEvent extends StreamEvent<
  "text_delta",
  {
    text: string;
  }
> {}

export interface ToolUseStartEvent extends StreamEvent<
  "tool_use_start",
  {
    toolCallId: string;
    toolName: string;
  }
> {}

export interface InputJsonDeltaEvent extends StreamEvent<
  "input_json_delta",
  {
    partialJson: string;
  }
> {}

export interface ToolUseStopEvent extends StreamEvent<
  "tool_use_stop",
  {
    toolCallId: string;
    toolName: string;
    input: Record<string, unknown>;
  }
> {}

export interface ToolResultEvent extends StreamEvent<
  "tool_result",
  {
    toolCallId: string;
    result: unknown;
    isError?: boolean;
  }
> {}

export interface ErrorEvent extends StreamEvent<
  "error",
  {
    message: string;
    errorCode?: string;
  }
> {}

export interface InterruptedEvent extends StreamEvent<
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
  | MessageStopEvent
  | TextDeltaEvent
  | ToolUseStartEvent
  | InputJsonDeltaEvent
  | ToolUseStopEvent
  | ToolResultEvent
  | ErrorEvent
  | InterruptedEvent;

/**
 * DriverStreamEventType - String literal union of event types
 */
export type DriverStreamEventType = DriverStreamEvent["type"];

// ============================================================================
// Driver Configuration
// ============================================================================

/**
 * DriverConfig - All configuration for creating a Driver
 *
 * This is our capability boundary - we define what we support.
 * Specific implementations (Claude, OpenAI) must work within this.
 *
 * @typeParam TOptions - Driver-specific options type. Each driver implementation
 * can define its own options interface and pass it as a type parameter.
 *
 * @example
 * ```typescript
 * // Define driver-specific options
 * interface ClaudeDriverOptions {
 *   claudeCodePath?: string;
 *   maxTurns?: number;
 * }
 *
 * // Use with type parameter
 * const config: DriverConfig<ClaudeDriverOptions> = {
 *   apiKey: "...",
 *   agentId: "my-agent",
 *   options: {
 *     claudeCodePath: "/usr/local/bin/claude"
 *   }
 * };
 * ```
 */
export interface DriverConfig<TOptions = Record<string, unknown>> {
  // === Provider Configuration ===

  /**
   * API key for authentication
   */
  apiKey: string;

  /**
   * Base URL for API endpoint (optional, for custom deployments)
   */
  baseUrl?: string;

  /**
   * Model identifier (e.g., "claude-sonnet-4-20250514")
   */
  model?: string;

  /**
   * Request timeout in milliseconds (default: 600000 = 10 minutes)
   */
  timeout?: number;

  // === Agent Configuration ===

  /**
   * Agent ID (for identification and logging)
   */
  agentId: string;

  /**
   * System prompt for the agent
   */
  systemPrompt?: string;

  /**
   * Current working directory for tool execution
   */
  cwd?: string;

  /**
   * MCP servers configuration
   */
  mcpServers?: Record<string, McpServerConfig>;

  /**
   * Tool definitions for LLM tool calling
   *
   * Tools are passed to the LLM provider and executed when the LLM
   * requests a tool call. Each tool includes its JSON Schema (sent to
   * the LLM) and an execute function (called at runtime).
   */
  tools?: ToolDefinition[];

  // === Session Configuration ===

  /**
   * Session for message history access
   *
   * Stateless drivers (like MonoDriver) use this to read conversation history.
   * Stateful drivers (like ClaudeDriver) may ignore this as they manage
   * history internally via SDK.
   *
   * @example
   * ```typescript
   * // MonoDriver reads history from Session
   * const history = await config.session?.getMessages();
   * ```
   */
  session?: Session;

  /**
   * Session ID to resume (for conversation continuity)
   *
   * If provided, Driver will attempt to resume this session.
   * If not provided, a new session is created.
   */
  resumeSessionId?: string;

  /**
   * Callback when SDK session ID is captured
   *
   * Called once when the session ID becomes available.
   * Save this ID to enable session resume later.
   */
  onSessionIdCaptured?: (sessionId: string) => void;

  // === Driver-Specific Options ===

  /**
   * Driver-specific options
   *
   * Each driver implementation can define its own options type.
   * This allows drivers to have custom configuration without
   * polluting the base DriverConfig interface.
   *
   * @example
   * ```typescript
   * // ClaudeDriver options
   * interface ClaudeDriverOptions {
   *   claudeCodePath?: string;
   * }
   *
   * const config: DriverConfig<ClaudeDriverOptions> = {
   *   apiKey: "...",
   *   options: { claudeCodePath: "/usr/bin/claude" }
   * };
   * ```
   */
  options?: TOptions;
}

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
   * @returns AsyncIterable of stream events
   */
  receive(message: UserMessage): AsyncIterable<DriverStreamEvent>;

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
 * @typeParam TOptions - Driver-specific options type
 *
 * @example
 * ```typescript
 * // @agentxjs/claude-driver
 * export const createClaudeDriver: CreateDriver<ClaudeDriverOptions> = (config) => {
 *   return new ClaudeDriver(config);
 * };
 * ```
 */
export type CreateDriver<TOptions = Record<string, unknown>> = (
  config: DriverConfig<TOptions>
) => Driver;
