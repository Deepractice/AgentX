/**
 * Logger module
 *
 * Internal logger implementation for AgentX platform.
 * Provides lazy-initialized logging with pluggable backends.
 *
 * @example
 * ```typescript
 * import { createLogger } from "@anthropic-ai/sdk-core/common";
 *
 * // Safe at module level (before Runtime configured)
 * const logger = createLogger("engine/AgentEngine");
 *
 * // Later, at runtime
 * logger.info("Agent initialized", { agentId: "xxx" });
 * ```
 */

export { ConsoleLogger, type ConsoleLoggerOptions } from "./ConsoleLogger";
export {
  createLogger,
  type LoggerFactoryConfig,
  LoggerFactoryImpl,
  setLoggerFactory,
} from "./LoggerFactoryImpl";
export type { LogContext, Logger, LoggerFactory, LogLevel } from "./types";
