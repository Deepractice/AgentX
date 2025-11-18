/**
 * @deepractice-ai/agentx-logger
 *
 * SLF4J-style logging facade for AgentX with decorator support.
 *
 * @example
 * ```typescript
 * import { Logger, LoggerFactory, LogLevel } from "@deepractice-ai/agentx-logger";
 *
 * // Decorator style (recommended)
 * class MyService {
 *   @Logger()
 *   private logger!: LoggerProvider;
 *
 *   doSomething() {
 *     this.logger.info("Hello from MyService");
 *   }
 * }
 *
 * // Factory style (SLF4J-like)
 * class MyOtherService {
 *   private logger = LoggerFactory.getLogger(MyOtherService);
 *
 *   doSomething() {
 *     this.logger.info("Hello from factory");
 *   }
 * }
 *
 * // Configure globally
 * LoggerFactory.configure({
 *   defaultLevel: LogLevel.DEBUG,
 *   consoleOptions: { colors: true }
 * });
 * ```
 *
 * @packageDocumentation
 */

// ==================== Types ====================
export type { LoggerProvider, LogContext } from "./types";
export { LogLevel } from "./types";

// ==================== Core Implementations ====================
export { ConsoleLogger } from "./core";
export type { ConsoleLoggerOptions } from "./core";
export { NoOpLogger } from "./core";
export { LoggerFactory } from "./core";
export type { LoggerFactoryConfig } from "./core";

// ==================== API ====================
export { Logger } from "./api";
export type { LoggerOptions } from "./api";
export { createLogger } from "./api";
export type { CreateLoggerOptions } from "./api";
