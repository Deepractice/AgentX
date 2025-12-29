/**
 * LogTapeLogger - Production-grade logger using LogTape
 *
 * Features:
 * - Zero dependencies, native Bun support
 * - No worker threads (compatible with bun --compile)
 * - File logging with rotation
 * - Console output with formatting
 * - Implements AgentX LoggerFactory interface
 */

import {
  configure,
  getConsoleSink,
  getLogger,
  type Logger as LogTapeLogger,
} from "@logtape/logtape";
import { getRotatingFileSink } from "@logtape/file";
import type { Logger, LoggerFactory, LogContext, LogLevel } from "agentxjs";

/**
 * Map AgentX log levels to LogTape log levels
 */
const LEVEL_MAP: Record<LogLevel, "debug" | "info" | "warning" | "error"> = {
  debug: "debug",
  info: "info",
  warn: "warning",
  error: "error",
  silent: "error", // LogTape doesn't have silent, use error as fallback
};

/**
 * LogTapeLoggerAdapter - Adapts LogTape logger to AgentX Logger interface
 */
class LogTapeLoggerAdapter implements Logger {
  constructor(
    public readonly name: string,
    public readonly level: LogLevel,
    private readonly logger: LogTapeLogger
  ) {}

  debug(message: string, context?: LogContext): void {
    if (context) {
      this.logger.debug("{message} {context}", { message, context });
    } else {
      this.logger.debug("{message}", { message });
    }
  }

  info(message: string, context?: LogContext): void {
    if (context) {
      this.logger.info("{message} {context}", { message, context });
    } else {
      this.logger.info("{message}", { message });
    }
  }

  warn(message: string, context?: LogContext): void {
    if (context) {
      this.logger.warn("{message} {context}", { message, context });
    } else {
      this.logger.warn("{message}", { message });
    }
  }

  error(message: string | Error, context?: LogContext): void {
    if (message instanceof Error) {
      this.logger.error("{message} {error}", {
        message: message.message,
        error: message.stack,
        ...context,
      });
    } else if (context) {
      this.logger.error("{message} {context}", { message, context });
    } else {
      this.logger.error("{message}", { message });
    }
  }

  isDebugEnabled(): boolean {
    return this.level === "debug";
  }

  isInfoEnabled(): boolean {
    return this.level === "debug" || this.level === "info";
  }

  isWarnEnabled(): boolean {
    return this.level !== "silent" && this.level !== "error";
  }

  isErrorEnabled(): boolean {
    return this.level !== "silent";
  }
}

/**
 * LogTapeLoggerFactory - Creates LogTape-based loggers
 *
 * Supports multiple output targets:
 * - Console (with formatting)
 * - File (with rotation)
 */
export class LogTapeLoggerFactory implements LoggerFactory {
  private readonly level: LogLevel;
  private configured = false;

  constructor(
    private readonly options: {
      level: LogLevel;
      logDir: string;
      pretty?: boolean;
    }
  ) {
    this.level = options.level;
  }

  /**
   * Initialize LogTape configuration (must be called once before getting loggers)
   */
  async initialize(): Promise<void> {
    if (this.configured) return;

    const { level, logDir } = this.options;

    await configure({
      sinks: {
        console: getConsoleSink(),
        file: getRotatingFileSink(`${logDir}/portagent.log`, {
          maxSize: 10 * 1024 * 1024, // 10MB
          maxFiles: 7,
        }),
      },
      loggers: [
        {
          category: ["portagent"],
          lowestLevel: LEVEL_MAP[level],
          sinks: ["console", "file"],
        },
      ],
    });

    this.configured = true;
  }

  getLogger(name: string): Logger {
    const logger = getLogger(["portagent", name]);
    return new LogTapeLoggerAdapter(name, this.level, logger);
  }
}
