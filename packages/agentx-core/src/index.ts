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
import type { AgentDriver } from "./driver";
import type { AgentLogger } from "./AgentLogger";
import type { EngineConfig } from "./AgentEngine";

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
  logger?: AgentLogger,
  config?: EngineConfig
): AgentService {
  return new AgentService(driver, logger, config);
}

// Export AgentDriver (SPI - Service Provider Interface)
export type { AgentDriver } from "./driver";
export { BaseAgentDriver } from "./driver";
export { StreamEventBuilder } from "./driver";

// Export AgentEngine (Core orchestration)
export { AgentEngine, type EngineConfig } from "./AgentEngine";

// Export AgentService (User-facing API)
export { AgentService } from "./AgentService";

// Export AgentEventBus (Core)
export { AgentEventBus } from "./AgentEventBus";

// Export 4-layer event generation components
export { AgentStateMachine } from "./AgentStateMachine";
export { AgentMessageAssembler } from "./AgentMessageAssembler";
export { AgentExchangeTracker } from "./AgentExchangeTracker";

// Export AgentLogger (SPI)
export type { AgentLogger, LogContext } from "./AgentLogger";
export { LogLevel, LogFormatter } from "./AgentLogger";

// Export Reactor Pattern (Advanced - for custom implementations)
export type { Reactor, ReactorContext } from "./reactor";
export { ReactorRegistry, type ReactorRegistryConfig } from "./reactor";
