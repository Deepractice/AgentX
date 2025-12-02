/**
 * BrowserLogger - Styled console logger for browsers
 *
 * Uses CSS styling for beautiful console output in browser DevTools.
 * Provides colorful, grouped logs with timestamps.
 */

import type { Logger, LogContext, LogLevel } from "@deepractice-ai/agentx-types";
import { LogLevel as LogLevelEnum } from "@deepractice-ai/agentx-types";

export interface BrowserLoggerOptions {
  level?: LogLevel;
  collapsed?: boolean; // Use console.groupCollapsed for context
}

export class BrowserLogger implements Logger {
  readonly name: string;
  readonly level: LogLevel;
  private readonly collapsed: boolean;

  // CSS styles for different log levels
  private static readonly STYLES = {
    DEBUG: "color: #6B7280; font-weight: normal;", // gray
    INFO: "color: #10B981; font-weight: normal;", // green
    WARN: "color: #F59E0B; font-weight: bold;", // amber
    ERROR: "color: #EF4444; font-weight: bold;", // red
    TIMESTAMP: "color: #9CA3AF; font-weight: normal;", // light gray
    NAME: "color: #8B5CF6; font-weight: normal;", // purple
    MESSAGE: "color: inherit; font-weight: normal;",
  };

  // Badge styles for level indicators
  private static readonly BADGE_STYLES = {
    DEBUG:
      "background: #E5E7EB; color: #374151; padding: 2px 6px; border-radius: 3px; font-size: 11px;",
    INFO: "background: #D1FAE5; color: #065F46; padding: 2px 6px; border-radius: 3px; font-size: 11px;",
    WARN: "background: #FEF3C7; color: #92400E; padding: 2px 6px; border-radius: 3px; font-size: 11px;",
    ERROR:
      "background: #FEE2E2; color: #991B1B; padding: 2px 6px; border-radius: 3px; font-size: 11px;",
  };

  constructor(name: string, options: BrowserLoggerOptions = {}) {
    this.name = name;
    this.level = options.level ?? LogLevelEnum.INFO;
    this.collapsed = options.collapsed ?? true;
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
    const timestamp = new Date().toLocaleTimeString();
    const consoleMethod = this.getConsoleMethod(level);
    const badgeStyle = BrowserLogger.BADGE_STYLES[level as keyof typeof BrowserLogger.BADGE_STYLES];

    // Format: [TIME] [LEVEL] [NAME] message
    const format = `%c${timestamp} %c${level}%c %c[${this.name}]%c ${message}`;
    const styles = [
      BrowserLogger.STYLES.TIMESTAMP,
      badgeStyle,
      "", // reset after badge
      BrowserLogger.STYLES.NAME,
      BrowserLogger.STYLES.MESSAGE,
    ];

    if (context && Object.keys(context).length > 0) {
      // Use grouping for context
      const groupMethod = this.collapsed ? console.groupCollapsed : console.group;
      groupMethod.call(console, format, ...styles);
      console.log("Context:", context);
      console.groupEnd();
    } else {
      consoleMethod(format, ...styles);
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
}
