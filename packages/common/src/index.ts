/**
 * AgentX Common
 *
 * Internal common infrastructure for AgentX platform.
 * Provides shared utilities used by internal packages (engine, agent, etc.)
 *
 * ## Module Structure
 *
 * | Module   | Purpose                                      |
 * |----------|----------------------------------------------|
 * | logger/  | Lazy-initialized logging with pluggable backends |
 *
 * ## Design Principles
 *
 * 1. **Internal Use**: For AgentX internal packages only
 * 2. **Lazy Initialization**: Safe to use at module level
 * 3. **Pluggable**: External implementations via Runtime injection
 *
 * @example
 * ```typescript
 * import { createLogger } from "@agentxjs/common";
 *
 * const logger = createLogger("engine/AgentEngine");
 * logger.info("Hello");
 * ```
 *
 * @packageDocumentation
 */

// Re-export types from agentx-types for convenience
export type { LogLevel, Logger, LogContext, LoggerFactory } from "@agentxjs/types";

// Logger implementation
export {
  ConsoleLogger,
  type ConsoleLoggerOptions,
  LoggerFactoryImpl,
  type LoggerFactoryConfig,
  setLoggerFactory,
  createLogger,
} from "./logger";

// Note: SQLite abstraction is exported separately via "@agentxjs/common/sqlite"
// to keep the main entry browser-compatible
