/**
 * AgentX for Browser
 *
 * Browser SDK for AgentX - connects to WebSocket server.
 * Provides same Agent API as agentx-node.
 *
 * @packageDocumentation
 */

import { createAgent as createAgentCore, type LogLevel } from "@deepractice-ai/agentx-core";
import type { Agent } from "@deepractice-ai/agentx-api";
import { BrowserProvider } from "./providers/BrowserProvider";
import { ConsolaLoggerProvider } from "./providers/ConsolaLoggerProvider";
import type { BrowserAgentConfig } from "./types";

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
   * Logger tag (shown in brackets)
   * @default undefined
   */
  loggerTag?: string;

  /**
   * Log level
   * @default 'info'
   */
  logLevel?: LogLevel;

  /**
   * Enable fancy output (colors, icons)
   * @default true
   */
  fancy?: boolean;
}

/**
 * Create a new Agent instance for browser
 *
 * Automatically creates and injects BrowserProvider (WebSocket client) and optional ConsolaLoggerProvider.
 * For browser environment that connects to agentx-node WebSocket server.
 *
 * @param config - Agent configuration including WebSocket URL
 * @param options - Optional agent creation options (logging, etc.)
 * @returns Agent instance ready to use
 * @throws {AgentConfigError} If configuration is invalid
 *
 * @example
 * ```typescript
 * import { createAgent } from '@deepractice-ai/agentx-browser';
 *
 * // Without logging
 * const agent = createAgent({
 *   wsUrl: 'ws://localhost:5200/ws',
 *   sessionId: 'my-session',
 * });
 *
 * // With logging
 * const agent = createAgent(
 *   {
 *     wsUrl: 'ws://localhost:5200/ws',
 *     sessionId: 'my-session',
 *   },
 *   {
 *     enableLogging: true,
 *     loggerTag: 'Agent',
 *     logLevel: 'debug',
 *   }
 * );
 *
 * // Listen for events
 * agent.on('assistant', (event) => {
 *   console.log('Assistant:', event.message.content);
 * });
 *
 * agent.on('stream_event', (event) => {
 *   if (event.delta?.type === 'text_delta') {
 *     process.stdout.write(event.delta.text);
 *   }
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
export function createAgent(config: BrowserAgentConfig, options?: CreateAgentOptions): Agent {
  const provider = new BrowserProvider(config);

  // Create logger if enabled
  const logger = options?.enableLogging
    ? new ConsolaLoggerProvider({
        level: (options.logLevel || "info") as LogLevel,
        tag: options.loggerTag,
        fancy: options.fancy !== false, // Default to true
      })
    : undefined;

  return createAgentCore(config, provider, logger);
}

// Export BrowserAgentConfig
export type { BrowserAgentConfig } from "./config/BrowserAgentConfig";

// Re-export types for convenience
export type {
  Agent,
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
export { BrowserProvider } from "./providers/BrowserProvider";
export { ConsolaLoggerProvider } from "./providers/ConsolaLoggerProvider";
export type { ConsolaLoggerConfig } from "./providers/ConsolaLoggerProvider";

// Re-export LoggerProvider types from core
export type { LoggerProvider, LogContext } from "@deepractice-ai/agentx-core";
export { LogLevel, LogFormatter } from "@deepractice-ai/agentx-core";
