/**
 * FileLoggerFactory - File-based logger for Node.js
 *
 * Writes logs to a file instead of console.
 * Useful for TUI applications where console output interferes with the UI.
 *
 * Usage:
 *   tail -f .agentx/logs/app.log
 */

import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import type { LogContext, Logger, LoggerFactory, LogLevel } from "commonxjs/logger";

export interface FileLoggerOptions {
  level?: LogLevel;
  timestamps?: boolean;
}

class FileLogger implements Logger {
  readonly name: string;
  readonly level: LogLevel;
  private readonly timestamps: boolean;
  private readonly filePath: string;
  private initialized = false;

  constructor(name: string, filePath: string, options: FileLoggerOptions = {}) {
    this.name = name;
    this.filePath = filePath;
    this.level = options.level ?? "debug";
    this.timestamps = options.timestamps ?? true;
  }

  private ensureDir(): void {
    if (this.initialized) return;
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    this.initialized = true;
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDebugEnabled()) {
      this.log("DEBUG", message, context);
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.isInfoEnabled()) {
      this.log("INFO", message, context);
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.isWarnEnabled()) {
      this.log("WARN", message, context);
    }
  }

  error(message: string | Error, context?: LogContext): void {
    if (this.isErrorEnabled()) {
      if (message instanceof Error) {
        this.log("ERROR", message.message, { ...context, stack: message.stack });
      } else {
        this.log("ERROR", message, context);
      }
    }
  }

  isDebugEnabled(): boolean {
    return this.getLevelValue(this.level) <= this.getLevelValue("debug");
  }

  isInfoEnabled(): boolean {
    return this.getLevelValue(this.level) <= this.getLevelValue("info");
  }

  isWarnEnabled(): boolean {
    return this.getLevelValue(this.level) <= this.getLevelValue("warn");
  }

  isErrorEnabled(): boolean {
    return this.getLevelValue(this.level) <= this.getLevelValue("error");
  }

  private getLevelValue(level: LogLevel): number {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      silent: 4,
    };
    return levels[level];
  }

  private log(level: string, message: string, context?: LogContext): void {
    this.ensureDir();

    const parts: string[] = [];

    if (this.timestamps) {
      parts.push(new Date().toISOString());
    }

    parts.push(level.padEnd(5));
    parts.push(`[${this.name}]`);
    parts.push(message);

    let logLine = parts.join(" ");

    if (context && Object.keys(context).length > 0) {
      logLine += ` ${JSON.stringify(context)}`;
    }

    logLine += "\n";

    try {
      appendFileSync(this.filePath, logLine);
    } catch {
      // Fallback to stderr if file write fails
      process.stderr.write(`[FileLogger] Failed to write: ${logLine}`);
    }
  }
}

/**
 * FileLoggerFactory options
 */
export interface FileLoggerFactoryOptions {
  /**
   * Directory for log files
   */
  logDir: string;

  /**
   * Log level
   * @default "debug"
   */
  level?: LogLevel;

  /**
   * Log file name
   * @default "app.log"
   */
  filename?: string;
}

/**
 * FileLoggerFactory - Creates FileLogger instances
 */
export class FileLoggerFactory implements LoggerFactory {
  private readonly filePath: string;
  private readonly level: LogLevel;
  private readonly loggers: Map<string, FileLogger> = new Map();

  constructor(options: FileLoggerFactoryOptions) {
    this.filePath = join(options.logDir, options.filename ?? "app.log");
    this.level = options.level ?? "debug";
  }

  getLogger(name: string): Logger {
    if (this.loggers.has(name)) {
      return this.loggers.get(name)!;
    }

    const logger = new FileLogger(name, this.filePath, {
      level: this.level,
    });

    this.loggers.set(name, logger);
    return logger;
  }
}
