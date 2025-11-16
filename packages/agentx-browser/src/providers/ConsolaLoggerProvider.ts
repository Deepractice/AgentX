/**
 * ConsolaLoggerProvider
 *
 * Browser implementation of AgentLogger using Consola.
 * Provides beautiful, colorful console logging for browser environments.
 */

import { createConsola, type ConsolaInstance } from "consola";
import type {
  AgentLogger,
  LogLevel,
  LogContext,
} from "@deepractice-ai/agentx-core";

/**
 * Consola logger provider configuration
 */
export interface ConsolaLoggerConfig {
  /**
   * Minimum log level to output
   * @default 'info'
   */
  level?: LogLevel;

  /**
   * Logger tag/name (shown in brackets)
   * @example "[Agent]"
   */
  tag?: string;

  /**
   * Enable fancy output (colors, icons, etc.)
   * @default true
   */
  fancy?: boolean;

  /**
   * Custom consola options
   */
  consolaOptions?: Partial<any>;
}

/**
 * Map LogLevel to Consola levels
 */
const LOG_LEVEL_MAP: Record<LogLevel, number> = {
  debug: 4,   // Consola.debug
  info: 3,    // Consola.info
  warn: 2,    // Consola.warn
  error: 1,   // Consola.error
};

/**
 * Consola logger provider implementation
 *
 * Features:
 * - Beautiful colorful console output
 * - Browser DevTools integration
 * - Template string and variadic arguments support
 * - Child loggers with bound context
 * - Dynamic log level control
 *
 * @example
 * ```typescript
 * // Basic usage
 * const logger = new ConsolaLoggerProvider();
 *
 * // With tag
 * const logger = new ConsolaLoggerProvider({ tag: 'Agent' });
 *
 * // With log level
 * const logger = new ConsolaLoggerProvider({ level: 'debug' });
 *
 * // Usage
 * logger.info("Agent created", { agentId: "123" });
 * logger.debug("Processing message %s", messageId);
 * logger.error("Failed to send", error);
 * ```
 */
export class ConsolaLoggerProvider implements AgentLogger {
  private consola: ConsolaInstance;
  private currentLevel: LogLevel;
  private boundContext: LogContext;

  constructor(
    config: ConsolaLoggerConfig = {},
    consola?: ConsolaInstance,
    boundContext?: LogContext
  ) {
    this.currentLevel = (config.level || "info") as LogLevel;
    this.boundContext = boundContext || {};

    // If consola is provided (for child loggers), use it
    if (consola) {
      this.consola = consola;
      return;
    }

    // Create consola instance
    this.consola = createConsola({
      level: LOG_LEVEL_MAP[this.currentLevel],
      ...config.consolaOptions,
    });

    // Add tag if provided
    if (config.tag) {
      this.consola = this.consola.withTag(config.tag);
    }
  }

  log(level: LogLevel, message: string, ...args: any[]): void {
    const { context, formattedMessage } = this.parseArgs(message, args);

    // Merge bound context with log context
    const mergedContext = { ...this.boundContext, ...context };

    // Format message with context
    const finalMessage = this.formatMessageWithContext(formattedMessage, mergedContext);

    // Call appropriate consola method
    switch (level) {
      case "debug":
        this.consola.debug(finalMessage);
        break;
      case "info":
        this.consola.info(finalMessage);
        break;
      case "warn":
        this.consola.warn(finalMessage);
        break;
      case "error":
        this.consola.error(finalMessage);
        break;
    }
  }

  debug(message: string, ...args: any[]): void {
    this.log("debug" as LogLevel, message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log("info" as LogLevel, message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log("warn" as LogLevel, message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.log("error" as LogLevel, message, ...args);
  }

  withContext(context: LogContext): AgentLogger {
    // Create child logger with merged context
    const mergedContext = { ...this.boundContext, ...context };

    // Create a new instance with the same consola but merged context
    return new ConsolaLoggerProvider(
      { level: this.currentLevel },
      this.consola,
      mergedContext
    );
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
    this.consola.level = LOG_LEVEL_MAP[level];
  }

  isLevelEnabled(level: LogLevel): boolean {
    const requiredLevel = LOG_LEVEL_MAP[level];
    const currentLevel = LOG_LEVEL_MAP[this.currentLevel];
    return requiredLevel <= currentLevel;
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
      formattedMessage = [message, ...formatArgs.map((arg) => {
        if (arg instanceof Error) {
          return arg.message;
        }
        if (typeof arg === "object") {
          return JSON.stringify(arg);
        }
        return String(arg);
      })].join(" ");
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

  /**
   * Format message with context
   *
   * If context is not empty, append it to the message
   */
  private formatMessageWithContext(message: string, context: LogContext): string {
    if (Object.keys(context).length === 0) {
      return message;
    }

    // Format context as compact JSON
    const contextStr = this.formatContext(context);
    return `${message} ${contextStr}`;
  }

  /**
   * Format context as compact string
   *
   * @example
   * { agentId: "123", sessionId: "456" }
   * → "{ agentId: 123, sessionId: 456 }"
   */
  private formatContext(context: LogContext): string {
    const entries = Object.entries(context)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => {
        if (value instanceof Error) {
          return `${key}: ${value.message}`;
        }
        if (typeof value === "object") {
          return `${key}: ${JSON.stringify(value)}`;
        }
        if (typeof value === "string") {
          return `${key}: "${value}"`;
        }
        return `${key}: ${value}`;
      });

    return entries.length > 0 ? `{ ${entries.join(", ")} }` : "";
  }
}
