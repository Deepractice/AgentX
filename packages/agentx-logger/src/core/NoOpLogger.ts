/**
 * NoOpLogger
 *
 * No-operation logger that discards all log messages.
 * Useful for testing or disabling logging entirely.
 */

import { LoggerProvider, LogLevel, type LogContext } from "~/types";

/**
 * NoOpLogger implementation
 *
 * All logging methods are no-ops (do nothing).
 * Useful for testing or when you want to disable logging.
 */
export class NoOpLogger implements LoggerProvider {
  readonly name: string;
  readonly level: LogLevel = LogLevel.SILENT;

  constructor(name: string = "NoOp") {
    this.name = name;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  debug(_message: string, _context?: LogContext): void {
    // No-op
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  info(_message: string, _context?: LogContext): void {
    // No-op
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  warn(_message: string, _context?: LogContext): void {
    // No-op
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  error(_message: string | Error, _context?: LogContext): void {
    // No-op
  }

  isDebugEnabled(): boolean {
    return false;
  }

  isInfoEnabled(): boolean {
    return false;
  }

  isWarnEnabled(): boolean {
    return false;
  }

  isErrorEnabled(): boolean {
    return false;
  }
}
