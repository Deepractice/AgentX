/**
 * FileLogger - Logger that writes to both console and file
 *
 * Used by dev-server to persist logs to disk for debugging.
 * Logs are written to daily log files in the specified directory.
 */

import fs from "node:fs";
import path from "node:path";
import type { Logger, LoggerFactory, LogContext, LogLevel } from "@agentxjs/types";

/**
 * FileLogger implementation
 *
 * Logs to both console (with colors) and file (plain text)
 */
export class FileLogger implements Logger {
  private static readonly COLORS = {
    DEBUG: "\x1b[36m",
    INFO: "\x1b[32m",
    WARN: "\x1b[33m",
    ERROR: "\x1b[31m",
    RESET: "\x1b[0m",
  };

  constructor(
    public readonly name: string,
    public readonly level: LogLevel,
    private readonly logDir: string
  ) {
    // Ensure log directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
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
    const timestamp = new Date().toISOString();
    const contextStr = context && Object.keys(context).length > 0 ? JSON.stringify(context) : "";

    // Console output (with colors)
    const consoleParts: string[] = [];
    consoleParts.push(timestamp);
    const color = FileLogger.COLORS[level as keyof typeof FileLogger.COLORS];
    consoleParts.push(`${color}${level.padEnd(5)}${FileLogger.COLORS.RESET}`);
    consoleParts.push(`[${this.name}]`);
    consoleParts.push(message);

    const consoleMethod = this.getConsoleMethod(level);
    if (contextStr) {
      consoleMethod(consoleParts.join(" "), context);
    } else {
      consoleMethod(consoleParts.join(" "));
    }

    // File output (plain text)
    const fileParts: string[] = [];
    fileParts.push(timestamp);
    fileParts.push(level.padEnd(5));
    fileParts.push(`[${this.name}]`);
    fileParts.push(message);
    if (contextStr) {
      fileParts.push(contextStr);
    }

    const logLine = fileParts.join(" ") + "\n";
    this.writeToFile(logLine);
  }

  private writeToFile(line: string): void {
    const logFile = path.join(this.logDir, `dev-server-${this.getDateString()}.log`);
    try {
      fs.appendFileSync(logFile, line);
    } catch (err) {
      // Silently ignore file write errors to prevent logging loops
      console.error("Failed to write to log file:", err);
    }
  }

  private getDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  private getConsoleMethod(level: string): (...args: unknown[]) => void {
    switch (level) {
      case "DEBUG":
        return console.debug.bind(console);
      case "INFO":
        return console.info.bind(console);
      case "WARN":
        return console.warn.bind(console);
      case "ERROR":
        return console.error.bind(console);
      default:
        return console.log.bind(console);
    }
  }
}

/**
 * FileLoggerFactory implementation
 *
 * Creates FileLogger instances for all loggers in the system.
 */
export class FileLoggerFactory implements LoggerFactory {
  constructor(
    private readonly level: LogLevel,
    private readonly logDir: string
  ) {}

  getLogger(name: string): Logger {
    return new FileLogger(name, this.level, this.logDir);
  }
}
