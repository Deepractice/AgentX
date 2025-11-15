/**
 * AgentX for Node.js
 *
 * Node.js SDK for AgentX - integrates with Claude Agent SDK.
 * Automatically creates ClaudeAgentProvider for you.
 *
 * @packageDocumentation
 */

import { createAgent as createAgentCore, type LogLevel } from "@deepractice-ai/agentx-core";
import type { Agent } from "@deepractice-ai/agentx-api";
import type { NodeAgentConfig } from "./config/NodeAgentConfig";
import { ClaudeAgentProvider } from "./providers/ClaudeAgentProvider";
import { PinoLoggerProvider } from "./providers/PinoLoggerProvider";

/**
 * Agent creation options
 */
export interface CreateAgentOptions {
  /**
   * Enable logging
   * @default false
   */
  enableLogging?: boolean;

  /**
   * Enable pretty-printing for development
   * @default false
   */
  prettyLogs?: boolean;

  /**
   * Log level
   * @default 'info'
   */
  logLevel?: LogLevel;
}

/**
 * Create a new Agent instance for Node.js
 *
 * Automatically creates and injects ClaudeAgentProvider and optional PinoLoggerProvider.
 * For direct Claude SDK integration in Node.js environment.
 *
 * @param config - Agent configuration including API key and model
 * @param options - Optional agent creation options (logging, etc.)
 * @returns Agent instance ready to use
 * @throws {AgentConfigError} If configuration is invalid
 *
 * @example
 * ```typescript
 * import { createAgent } from '@deepractice-ai/agentx-node';
 *
 * // Without logging
 * const agent = createAgent({
 *   apiKey: process.env.ANTHROPIC_API_KEY!,
 *   model: 'claude-sonnet-4-20250514',
 *   systemPrompt: 'You are a helpful assistant.',
 * });
 *
 * // With logging (development)
 * const agent = createAgent(
 *   {
 *     apiKey: process.env.ANTHROPIC_API_KEY!,
 *     model: 'claude-sonnet-4-20250514',
 *   },
 *   {
 *     enableLogging: true,
 *     prettyLogs: true,
 *     logLevel: 'debug'
 *   }
 * );
 *
 * // Listen for events
 * agent.on('assistant_message', (event) => {
 *   console.log('Assistant:', event.message.content);
 * });
 *
 * agent.on('result', (event) => {
 *   if (event.subtype === 'success') {
 *     console.log('Cost:', event.totalCostUsd);
 *     console.log('Tokens:', event.usage);
 *   }
 * });
 *
 * // Send message
 * await agent.send('Hello! How are you?');
 * ```
 */
export function createAgent(config: NodeAgentConfig, options?: CreateAgentOptions): Agent {
  const provider = new ClaudeAgentProvider(config);

  // Create logger if enabled
  const logger = options?.enableLogging
    ? new PinoLoggerProvider({
        level: (options.logLevel || "info") as LogLevel,
        pretty: options.prettyLogs || false,
      })
    : undefined;

  return createAgentCore(config, provider, logger);
}

// Export NodeAgentConfig
export type { NodeAgentConfig } from "./config/NodeAgentConfig";

// Re-export types for convenience
export type {
  Agent,
  LLMConfig,
  McpConfig,
  AgentEvent,
  EventType,
  EventPayload,
  UserMessageEvent,
  AssistantMessageEvent,
  StreamDeltaEvent,
  ResultEvent,
  SystemInitEvent,
} from "@deepractice-ai/agentx-api";

// Re-export errors
export { AgentConfigError, AgentAbortError } from "@deepractice-ai/agentx-api";

// Export providers for advanced usage
export { ClaudeAgentProvider, PinoLoggerProvider } from "./providers";
export type { PinoLoggerConfig } from "./providers";

// Re-export LoggerProvider types from core
export type { LoggerProvider, LogLevel, LogContext } from "@deepractice-ai/agentx-core";
export { LogFormatter } from "@deepractice-ai/agentx-core";

// Export WebSocket server
export { createWebSocketServer, WebSocketBridge } from "./server";
export type { WebSocketServerConfig, AgentWebSocketServer, ClientMessage, ServerMessage } from "./server";
