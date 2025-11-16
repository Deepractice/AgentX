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
// Re-export from @deepractice-ai/agentx-core

export type {
  // Generic reactor type
  Reactor,

  // Stream layer reactors
  StreamReactor,
  PartialStreamReactor,

  // State layer reactors
  StateReactor,
  PartialStateReactor,

  // Message layer reactors
  MessageReactor,
  PartialMessageReactor,

  // Exchange layer reactors
  ExchangeReactor,
  PartialExchangeReactor,
} from "@deepractice-ai/agentx-core";

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
 * LoggerProvider interface - for custom logging
 */
export type { LoggerProvider, LogContext } from "@deepractice-ai/agentx-core";
export { LogLevel, LogFormatter } from "@deepractice-ai/agentx-core";

/**
 * RuntimeConfig - for configuring agent runtime
 */
export type { RuntimeConfig } from "@deepractice-ai/agentx-core";

// ==================== Configuration ====================
// Own types (kept from current agentx-api)

export type {
  AgentConfig,
  ApiConfig,
  LLMConfig,
  McpConfig,
  McpServerConfig,
  McpTransportConfig,
} from "./config";

// ==================== Errors ====================
// Own errors (kept from current agentx-api)

export { AgentConfigError, AgentAbortError } from "./errors";

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
