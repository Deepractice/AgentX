/**
 * @deepractice-ai/agentx-framework
 *
 * Unified API surface for the AgentX ecosystem.
 * Users only need to depend on this package.
 *
 * @packageDocumentation
 */

// ==================== Core API ====================
// Re-export from @deepractice-ai/agentx-core

/**
 * Create a new Agent instance
 *
 * @example
 * ```typescript
 * import { createAgent } from "@deepractice-ai/agentx-framework";
 * import { ClaudeDriver } from "@deepractice-ai/agentx-node";
 *
 * const agent = createAgent(new ClaudeDriver(config));
 * await agent.initialize();
 * ```
 */
export { createAgent } from "@deepractice-ai/agentx-core";

/**
 * AgentService - User-facing API
 *
 * Methods: initialize(), send(), react(), clear(), destroy()
 * Properties: id, sessionId, messages
 */
export { AgentService } from "@deepractice-ai/agentx-core";

// ==================== Messages (User Data) ====================
// Re-export from @deepractice-ai/agentx-types

export type {
  // Message types (user needs to work with these)
  Message,
  UserMessage,
  AssistantMessage,
  SystemMessage,
  ToolUseMessage,
  ErrorMessage,

  // Content parts (for multimodal messages)
  ContentPart,
  TextPart,
  ThinkingPart,
  ImagePart,
  FilePart,
  ToolCallPart,
  ToolResultPart,

  // Message metadata
  MessageRole,
  ErrorSubtype,
  ErrorSeverity,
} from "@deepractice-ai/agentx-types";

// Type guards (user may need these)
export {
  isUserMessage,
  isAssistantMessage,
  isSystemMessage,
  isToolUseMessage,
  isErrorMessage,
  isTextPart,
  isThinkingPart,
  isImagePart,
  isFilePart,
  isToolCallPart,
  isToolResultPart,
} from "@deepractice-ai/agentx-types";

// ==================== Events (Observable Data) ====================
// Re-export from @deepractice-ai/agentx-event

export type {
  // Base event types
  AgentEvent,
  AgentEventType,

  // Event bus interfaces (for advanced users)
  EventBus,
  EventProducer,
  EventConsumer,
  Unsubscribe,
} from "@deepractice-ai/agentx-event";

// Stream layer events (real-time streaming)
export type {
  StreamEventType,
  MessageStartEvent,
  MessageDeltaEvent,
  MessageStopEvent,
  TextContentBlockStartEvent,
  TextDeltaEvent,
  TextContentBlockStopEvent,
  ToolUseContentBlockStartEvent,
  InputJsonDeltaEvent,
  ToolUseContentBlockStopEvent,
} from "@deepractice-ai/agentx-event";

// State layer events (lifecycle & state transitions)
export type {
  StateEventType,
  AgentReadyStateEvent,
  ConversationStartStateEvent,
  ConversationThinkingStateEvent,
  ConversationRespondingStateEvent,
  ConversationEndStateEvent,
  ToolPlannedStateEvent,
  ToolExecutingStateEvent,
  ToolCompletedStateEvent,
  ToolFailedStateEvent,
  StreamStartStateEvent,
  StreamCompleteStateEvent,
  ErrorOccurredStateEvent,
} from "@deepractice-ai/agentx-event";

// Message layer events (complete messages)
export type {
  MessageEventType,
  UserMessageEvent,
  AssistantMessageEvent,
  ToolUseMessageEvent,
  ErrorMessageEvent,
} from "@deepractice-ai/agentx-event";

// Exchange layer events (analytics & cost tracking)
export type {
  ExchangeEventType,
  ExchangeRequestEvent,
  ExchangeResponseEvent,
} from "@deepractice-ai/agentx-event";

// ==================== Reactors (Event Handlers) ====================

// Core reactor types (from @deepractice-ai/agentx-core)
export type {
  Reactor,
  ReactorContext,
} from "@deepractice-ai/agentx-core";

// 4-layer user-facing reactor interfaces (framework-provided)
export type {
  StreamReactor,
  StateReactor,
  MessageReactor,
  ExchangeReactor,
} from "./interfaces";

// Reactor adapters (for advanced framework usage)
export {
  StreamReactorAdapter,
  StateReactorAdapter,
  MessageReactorAdapter,
  ExchangeReactorAdapter,
  wrapUserReactor,
  type UserReactor,
} from "./reactors";

// ==================== Platform Abstraction ====================
// Re-export from @deepractice-ai/agentx-core

/**
 * AgentDriver interface - for implementing custom drivers
 *
 * Most users don't need this - use platform-specific drivers:
 * - ClaudeDriver from @deepractice-ai/agentx-node
 * - BrowserDriver from @deepractice-ai/agentx-browser
 */
export type { AgentDriver } from "@deepractice-ai/agentx-core";

/**
 * AgentLogger interface - for custom logging
 */
export type { AgentLogger, LogContext } from "@deepractice-ai/agentx-core";
export { LogLevel, LogFormatter } from "@deepractice-ai/agentx-core";

/**
 * EngineConfig - for configuring agent engine runtime
 */
export type { EngineConfig } from "@deepractice-ai/agentx-core";

// ==================== Framework Define API ====================
// Simplified APIs for building custom drivers, reactors, and agents

/**
 * defineDriver - Simplified driver creation
 *
 * @example
 * ```typescript
 * const MyDriver = defineDriver({
 *   name: "MyDriver",
 *   generate: async function* (message) {
 *     yield "Hello: " + message;
 *   }
 * });
 * ```
 */
export { defineDriver } from "./defineDriver";
export type {
  DriverDefinition,
  DefinedDriver,
} from "./defineDriver";

/**
 * defineReactor - Simplified reactor creation
 *
 * @example
 * ```typescript
 * const Logger = defineReactor({
 *   name: "Logger",
 *   onTextDelta: (event) => console.log(event.data.text)
 * });
 * ```
 */
export { defineReactor } from "./defineReactor";
export type {
  ReactorDefinition,
  DefinedReactor,
} from "./defineReactor";

/**
 * defineConfig - Schema-based configuration
 *
 * @example
 * ```typescript
 * const MyConfig = defineConfig({
 *   apiKey: { type: "string", required: true },
 *   model: { type: "string", default: "claude-3-5-sonnet" }
 * });
 * ```
 */
export { defineConfig, ConfigValidationError } from "./defineConfig";
export type {
  DefinedConfig,
  ConfigSchema,
  FieldDefinition,
  FieldType,
  InferConfig,
} from "./defineConfig";

/**
 * defineAgent - Compose driver, reactors, and config
 *
 * @example
 * ```typescript
 * const MyAgent = defineAgent({
 *   name: "MyAgent",
 *   driver: defineDriver({ ... }),
 *   reactors: [defineReactor({ ... })],
 *   config: defineConfig({ ... })
 * });
 *
 * const agent = MyAgent.create({ apiKey: "xxx" });
 * ```
 */
export { defineAgent } from "./defineAgent";
export type {
  AgentDefinition,
  DefinedAgent,
} from "./defineAgent";

// ==================== Errors ====================
// Framework-specific errors

export { AgentConfigError, AgentAbortError } from "./errors";

// ==================== Drivers ====================
// Platform-specific and framework drivers

/**
 * ClaudeSDKDriver - Node.js driver using @anthropic-ai/claude-agent-sdk
 * Full-featured Claude SDK integration with streaming, tools, and MCP
 */
export { ClaudeSDKDriver, type ClaudeSDKDriverConfig } from "./drivers";

/**
 * WebSocketDriver - Client-side WebSocket driver for browser
 * Converts WebSocket messages → Agent events
 */
export { WebSocketDriver, type WebSocketDriverConfig } from "./drivers";

// ==================== Reactor Implementations ====================
// Built-in reactor implementations

/**
 * WebSocketReactor - Server-side event forwarder
 * Converts Agent events → WebSocket messages
 * Implements all 4 reactor layers (Stream, State, Message, Exchange)
 */
export { WebSocketReactor, type WebSocketLike, type WebSocketReactorConfig } from "./reactors";

// ==================== Pre-configured Agents ====================
// Ready-to-use agent compositions

/**
 * ClaudeAgent - Pre-configured Agent using Claude SDK
 * @example
 * ```typescript
 * const agent = ClaudeAgent.create({ apiKey: "xxx" });
 * ```
 */
export { ClaudeAgent } from "./agents";

/**
 * WebSocketServerAgent - Claude + WebSocket forwarding (Agent composition!)
 * Demonstrates Agent-as-Driver pattern: ClaudeAgent → WebSocketReactor
 * @example
 * ```typescript
 * const agent = WebSocketServerAgent.create({ apiKey: "xxx", ws: websocket });
 * ```
 */
export { WebSocketServerAgent } from "./agents";

// ==================== MCP (Model Context Protocol) ====================
// Re-export from @deepractice-ai/agentx-types (for users working with MCP servers)

export type {
  // MCP Tools
  McpTool,
  McpToolResult,
  JsonSchema,

  // MCP Resources
  McpResource,
  McpResourceContents,

  // MCP Prompts
  McpPrompt,
  McpPromptMessage,

  // MCP Server
  McpServerInfo,
  McpServerCapabilities,

  // MCP Transport (from agentx-types, different from config/McpTransportConfig)
  McpStdioTransport,
  McpSseTransport,
  McpHttpTransport,
} from "@deepractice-ai/agentx-types";

export {
  LATEST_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
} from "@deepractice-ai/agentx-types";
