/**
 * PinoLoggerProvider
 *
 * Node.js implementation of AgentLogger using Pino.
 * Provides high-performance structured logging with pretty-printing support.
 */

import pino from "pino";
import {
  LogLevel,
  type AgentLogger,
  type LogContext,
} from "@deepractice-ai/agentx-core";

/**
 * Pino logger provider configuration
 */
export interface PinoLoggerConfig {
  /**
   * Minimum log level to output
   * @default 'info'
   */
  level?: LogLevel;

  /**
   * Enable pretty-printing for development
   * Uses pino-pretty for colorized output
   * @default false
   */
  pretty?: boolean;

  /**
   * Log file destination path
   * If not specified, logs to stdout
   */
  destination?: string;

  /**
   * Custom pino options
   * Merged with default options
   */
  pinoOptions?: pino.LoggerOptions;

  /**
   * Custom pino-pretty options (only when pretty is true)
   */
  prettyOptions?: Record<string, any>;
}

/**
 * Map LogLevel to Pino levels
 */
const LOG_LEVEL_MAP: Record<LogLevel, pino.Level> = {
  debug: "debug",
  info: "info",
  warn: "warn",
  error: "error",
};

/**
 * Pino logger provider implementation
 *
 * Features:
 * - High-performance structured logging
 * - Pretty-printing for development
 * - Template string and variadic arguments support
 * - Child loggers with bound context
 * - Dynamic log level control
 *
 * @example
 * ```typescript
 * // Development with pretty output
 * const logger = new PinoLoggerProvider({ pretty: true });
 *
 * // Production with JSON output
 * const logger = new PinoLoggerProvider({ level: 'info' });
 *
 * // With file output
 * const logger = new PinoLoggerProvider({
 *   destination: '/var/log/agent.log'
 * });
 *
 * // Usage
 * logger.info("Agent created", { agentId: "123" });
 * logger.debug("Processing message %s", messageId);
 * logger.error("Failed to send", error);
 * ```
 */
export class PinoLoggerProvider implements AgentLogger {
  private pino: pino.Logger;
  private currentLevel: LogLevel;
  private boundContext: LogContext;

  constructor(config: PinoLoggerConfig = {}, logger?: pino.Logger, boundContext?: LogContext) {
    this.currentLevel = config.level || LogLevel.INFO;
    this.boundContext = boundContext || {};

    // If logger is provided (for child loggers), use it
    if (logger) {
      this.pino = logger;
      return;
    }

    // Build pino options
    const pinoOptions: pino.LoggerOptions = {
      level: LOG_LEVEL_MAP[this.currentLevel],
      ...config.pinoOptions,
    };

    // Build transport config for pretty-printing + file destination
    if (config.pretty && config.destination) {
      // Pretty-print to file
      pinoOptions.transport = {
        target: "pino-pretty",
        options: {
          destination: config.destination,
          colorize: false, // Disable colors when writing to file
          translateTime: "HH:MM:ss.l",
          ignore: "pid,hostname",
          ...config.prettyOptions,
        },
      };
      this.pino = pino(pinoOptions);
    } else if (config.pretty) {
      // Pretty-print to stdout
      pinoOptions.transport = {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss.l",
          ignore: "pid,hostname",
          ...config.prettyOptions,
        },
      };
      this.pino = pino(pinoOptions);
    } else if (config.destination) {
      // JSON to file (no pretty)
      this.pino = pino(pinoOptions, pino.destination(config.destination));
    } else {
      // JSON to stdout (no pretty)
      this.pino = pino(pinoOptions);
    }
  }

  log(level: LogLevel, message: string, ...args: any[]): void {
    const pinoLevel = LOG_LEVEL_MAP[level];
    const { context, formattedMessage } = this.parseArgs(message, args);

    // Merge bound context with log context
    const mergedContext = { ...this.boundContext, ...context };

    this.pino[pinoLevel](mergedContext, formattedMessage);
  }

  debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  withContext(context: LogContext): AgentLogger {
    // Create child logger with merged context
    const mergedContext = { ...this.boundContext, ...context };
    const childPino = this.pino.child(context);

    return new PinoLoggerProvider(
      { level: this.currentLevel },
      childPino,
      mergedContext
    );
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
    this.pino.level = LOG_LEVEL_MAP[level];
  }

  isLevelEnabled(level: LogLevel): boolean {
    const pinoLevel = LOG_LEVEL_MAP[level];
    return this.pino.isLevelEnabled(pinoLevel);
  }

  /**
   * Parse arguments to extract context and format message
   *
   * Supports:
   * 1. logger.info("message") → { context: {}, message: "message" }
   * 2. logger.info("message", { ctx }) → { context: { ctx }, message: "message" }
   * 3. logger.info("template %s", arg) → { context: {}, message: "template arg" }
   * 4. logger.info("msg", arg1, arg2) → { context: {}, message: "msg arg1 arg2" }
   */
  private parseArgs(
    message: string,
    args: any[]
  ): { context: LogContext; formattedMessage: string } {
    if (args.length === 0) {
      // Case 1: Simple message
      return { context: {}, formattedMessage: message };
    }

    // Check if last arg is a context object
    const lastArg = args[args.length - 1];
    const isLastArgContext =
      lastArg &&
      typeof lastArg === "object" &&
      !Array.isArray(lastArg) &&
      !(lastArg instanceof Error) &&
      !(lastArg instanceof Date);

    if (args.length === 1 && isLastArgContext) {
      // Case 2: Message with context object
      return { context: lastArg, formattedMessage: message };
    }

    // Extract context if last arg is context object
    const context: LogContext = isLastArgContext ? args[args.length - 1] : {};
    const formatArgs = isLastArgContext ? args.slice(0, -1) : args;

    if (formatArgs.length === 0) {
      // Only context, no format args
      return { context, formattedMessage: message };
    }

    // Case 3 & 4: Template string or variadic arguments
    let formattedMessage = message;

    // Check if message contains format specifiers
    const hasFormatSpecifiers = /%[sdifjoO]/.test(message);

    if (hasFormatSpecifiers) {
      // Use simple sprintf-like formatting
      formattedMessage = this.formatMessage(message, formatArgs);
    } else {
      // Concatenate arguments
      formattedMessage = [message, ...formatArgs.map(String)].join(" ");
    }

    return { context, formattedMessage };
  }

  /**
   * Simple sprintf-like message formatting
   *
   * Supports: %s (string), %d (number), %j (JSON), %o (object)
   */
  private formatMessage(template: string, args: any[]): string {
    let argIndex = 0;

    return template.replace(/%([sdjoO])/g, (match, specifier) => {
      if (argIndex >= args.length) {
        return match;
      }

      const arg = args[argIndex++];

      switch (specifier) {
        case "s":
          return String(arg);
        case "d":
        case "i":
        case "f":
          return String(Number(arg));
        case "j":
          return JSON.stringify(arg);
        case "o":
        case "O":
          return JSON.stringify(arg, null, 2);
        default:
          return match;
      }
    });
  }
}
