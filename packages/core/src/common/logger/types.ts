/**
 * Logger type definitions
 *
 * Self-contained types for the logger module.
 * No external dependencies required.
 */

/**
 * LogLevel - Standard log level type
 *
 * Defines the severity levels for logging.
 * Uses string literal types for better readability and type safety.
 */
export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

/**
 * Logging context metadata
 */
export type LogContext = Record<string, unknown>;

/**
 * Logger interface
 *
 * Platform-agnostic logging interface that can be implemented
 * by any logging library (console, pino, winston, etc.)
 *
 * Similar to SLF4J's Logger interface in Java.
 */
export interface Logger {
  /**
   * Logger name (typically class name or module path)
   */
  readonly name: string;

  /**
   * Current log level
   */
  readonly level: LogLevel;

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void;

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void;

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void;

  /**
   * Log error message or Error object
   */
  error(message: string | Error, context?: LogContext): void;

  /**
   * Check if debug level is enabled
   */
  isDebugEnabled(): boolean;

  /**
   * Check if info level is enabled
   */
  isInfoEnabled(): boolean;

  /**
   * Check if warn level is enabled
   */
  isWarnEnabled(): boolean;

  /**
   * Check if error level is enabled
   */
  isErrorEnabled(): boolean;
}

/**
 * LoggerFactory interface
 *
 * Factory for creating named Logger instances.
 * External implementations can provide their own LoggerFactory
 * to integrate custom logging libraries (pino, winston, etc.)
 *
 * Similar to SLF4J's LoggerFactory in Java.
 */
export interface LoggerFactory {
  /**
   * Get or create a logger with the specified name
   *
   * @param name - Logger name (typically class name or module path)
   * @returns Logger instance
   */
  getLogger(name: string): Logger;
}
