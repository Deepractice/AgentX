/**
 * FileLogger - File-based logger for Node.js
 *
 * Writes logs to ~/.agentx/logs directory with rotation support.
 * Also outputs to console for development visibility.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import type { Logger, LogContext, LogLevel } from "@deepractice-ai/agentx-types";
import { LogLevel as LogLevelEnum } from "@deepractice-ai/agentx-types";

export interface FileLoggerOptions {
  level?: LogLevel;
  logDir?: string;
  maxFileSize?: number; // bytes, default 10MB
  maxFiles?: number; // default 5
  consoleOutput?: boolean; // also output to console, default true
}

export class FileLogger implements Logger {
  readonly name: string;
  readonly level: LogLevel;
  private readonly logDir: string;
  private readonly maxFileSize: number;
  private readonly maxFiles: number;
  private readonly consoleOutput: boolean;
  private currentLogFile: string;
  private writeStream: fs.WriteStream | null = null;

  private static readonly COLORS = {
    DEBUG: "\x1b[36m",
    INFO: "\x1b[32m",
    WARN: "\x1b[33m",
    ERROR: "\x1b[31m",
    RESET: "\x1b[0m",
  };

  constructor(name: string, options: FileLoggerOptions = {}) {
    this.name = name;
    this.level = options.level ?? LogLevelEnum.INFO;
    this.logDir = options.logDir ?? path.join(os.homedir(), ".agentx", "logs");
    this.maxFileSize = options.maxFileSize ?? 10 * 1024 * 1024; // 10MB
    this.maxFiles = options.maxFiles ?? 5;
    this.consoleOutput = options.consoleOutput ?? true;

    this.ensureLogDir();
    this.currentLogFile = this.getLogFilePath();
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
    return this.level <= LogLevelEnum.DEBUG;
  }

  isInfoEnabled(): boolean {
    return this.level <= LogLevelEnum.INFO;
  }

  isWarnEnabled(): boolean {
    return this.level <= LogLevelEnum.WARN;
  }

  isErrorEnabled(): boolean {
    return this.level <= LogLevelEnum.ERROR;
  }

  private log(level: string, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    const logEntry = this.formatLogEntry(timestamp, level, message, context);

    // Write to file
    this.writeToFile(logEntry);

    // Also output to console if enabled
    if (this.consoleOutput) {
      this.writeToConsole(timestamp, level, message, context);
    }
  }

  private formatLogEntry(
    timestamp: string,
    level: string,
    message: string,
    context?: LogContext
  ): string {
    const parts = [timestamp, level.padEnd(5), `[${this.name}]`, message];

    if (context && Object.keys(context).length > 0) {
      parts.push(JSON.stringify(context));
    }

    return parts.join(" ") + "\n";
  }

  private writeToConsole(
    timestamp: string,
    level: string,
    message: string,
    context?: LogContext
  ): void {
    const color = FileLogger.COLORS[level as keyof typeof FileLogger.COLORS];
    const parts = [
      timestamp,
      `${color}${level.padEnd(5)}${FileLogger.COLORS.RESET}`,
      `[${this.name}]`,
      message,
    ];

    const logLine = parts.join(" ");
    const consoleMethod = this.getConsoleMethod(level);

    if (context && Object.keys(context).length > 0) {
      consoleMethod(logLine, context);
    } else {
      consoleMethod(logLine);
    }
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

  private writeToFile(entry: string): void {
    try {
      // Check if rotation needed
      this.checkRotation();

      // Ensure write stream is open
      if (!this.writeStream) {
        this.writeStream = fs.createWriteStream(this.currentLogFile, { flags: "a" });
      }

      this.writeStream.write(entry);
    } catch {
      // Silently fail file writes - don't break the application
      // Console output is still available
    }
  }

  private checkRotation(): void {
    try {
      if (fs.existsSync(this.currentLogFile)) {
        const stats = fs.statSync(this.currentLogFile);
        if (stats.size >= this.maxFileSize) {
          this.rotateFiles();
        }
      }
    } catch {
      // Ignore rotation errors
    }
  }

  private rotateFiles(): void {
    // Close current stream
    if (this.writeStream) {
      this.writeStream.end();
      this.writeStream = null;
    }

    // Rotate existing files
    for (let i = this.maxFiles - 1; i >= 1; i--) {
      const oldPath = this.getLogFilePath(i);
      const newPath = this.getLogFilePath(i + 1);

      if (fs.existsSync(oldPath)) {
        if (i === this.maxFiles - 1) {
          fs.unlinkSync(oldPath); // Delete oldest
        } else {
          fs.renameSync(oldPath, newPath);
        }
      }
    }

    // Rename current to .1
    if (fs.existsSync(this.currentLogFile)) {
      fs.renameSync(this.currentLogFile, this.getLogFilePath(1));
    }
  }

  private getLogFilePath(index?: number): string {
    const filename = index ? `agentx.log.${index}` : "agentx.log";
    return path.join(this.logDir, filename);
  }

  private ensureLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Close the logger and flush any pending writes
   */
  close(): void {
    if (this.writeStream) {
      this.writeStream.end();
      this.writeStream = null;
    }
  }
}
