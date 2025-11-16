/**
 * AgentX Core
 *
 * Core implementation of the AgentX ecosystem with layered event architecture.
 * Requires a Driver to be injected (e.g., ClaudeDriver, WebSocketDriver).
 *
 * For platform-specific SDKs, use:
 * - @deepractice-ai/agentx-node (Node.js with ClaudeDriver)
 * - @deepractice-ai/agentx-browser (Browser with WebSocketDriver)
 *
 * @packageDocumentation
 */

import { AgentService } from "./AgentService";
import type { AgentDriver } from "./AgentDriver";
import type { LoggerProvider } from "./LoggerProvider";
import type { RuntimeConfig } from "./AgentRuntime";

/**
 * Create a new Agent instance with driver injection
 *
 * This is the low-level API. Most users should use platform-specific SDKs:
 * - @deepractice-ai/agentx-node for Node.js
 * - @deepractice-ai/agentx-browser for Browser
 *
 * @param driver - Platform-specific driver implementation
 * @param logger - Optional logger provider for agent logging
 * @param config - Optional runtime configuration (reactors, etc.)
 * @returns AgentService instance
 *
 * @example
 * ```typescript
 * import { createAgent } from "@deepractice-ai/agentx-core";
 * import { ClaudeDriver } from "@deepractice-ai/agentx-node";
 * import { PinoLoggerProvider } from "@deepractice-ai/agentx-node";
 *
 * const driver = new ClaudeDriver(config);
 * const logger = new PinoLoggerProvider();
 * const agent = createAgent(driver, logger, {
 *   reactors: [new MyChatHandler()]
 * });
 *
 * await agent.initialize();
 *
 * agent.react({
 *   onAssistantMessage(event) {
 *     console.log("Assistant:", event.data.content);
 *   },
 * });
 *
 * await agent.send("Hello!");
 * ```
 */
export function createAgent(
  driver: AgentDriver,
  logger?: LoggerProvider,
  config?: RuntimeConfig
): AgentService {
  return new AgentService(driver, logger, config);
}

// Export AgentDriver (SPI - Service Provider Interface)
export type { AgentDriver } from "./AgentDriver";

// Export AgentRuntime (Core orchestration)
export { AgentRuntime, type RuntimeConfig } from "./AgentRuntime";

// Export AgentService (User-facing API)
export { AgentService } from "./AgentService";

// Export AgentEventBus (Core)
export { AgentEventBus } from "./AgentEventBus";

// Export 4-layer event generation components
export { AgentStateMachine } from "./AgentStateMachine";
export { AgentMessageAssembler } from "./AgentMessageAssembler";
export { AgentExchangeTracker } from "./AgentExchangeTracker";

// Export LoggerProvider (SPI)
export type { LoggerProvider, LogContext } from "./LoggerProvider";
export { LogLevel, LogFormatter } from "./LoggerProvider";

// Export Reactors (type-safe interfaces)
export type {
  StreamReactor,
  PartialStreamReactor,
  StateReactor,
  PartialStateReactor,
  MessageReactor,
  PartialMessageReactor,
  ExchangeReactor,
  PartialExchangeReactor,
  Reactor,
} from "./AgentReactors";
