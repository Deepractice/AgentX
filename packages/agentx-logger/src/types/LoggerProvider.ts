/**
 * LoggerProvider
 *
 * Core logging interface (similar to SLF4J Logger).
 * Platform-agnostic logging facade that can be implemented by any logging library.
 */

/**
 * Log level enumeration
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

/**
 * Logging context metadata
 */
export type LogContext = Record<string, unknown>;

/**
 * LoggerProvider interface
 *
 * Main logging interface that all logger implementations must follow.
 * Similar to SLF4J's Logger interface.
 */
export interface LoggerProvider {
  /**
   * Logger name (class name or custom name)
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
