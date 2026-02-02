/**
 * Logger module
 *
 * Internal logger implementation for AgentX platform.
 * Provides lazy-initialized logging with pluggable backends.
 *
 * @example
 * ```typescript
 * import { createLogger } from "@agentxjs/common";
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
  LoggerFactoryImpl,
  type LoggerFactoryConfig,
  setLoggerFactory,
  createLogger,
} from "./LoggerFactoryImpl";
