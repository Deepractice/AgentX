/**
 * FileLoggerFactory - Factory for creating FileLogger instances
 *
 * Creates loggers that write to ~/.agentx/logs directory.
 * Used by NodeEcosystem to provide file-based logging.
 */

import type { Logger, LoggerFactory, LogLevel } from "@agentxjs/types";
import { FileLogger, type FileLoggerOptions } from "./FileLogger";

export interface FileLoggerFactoryOptions {
  level?: LogLevel;
  logDir?: string;
  maxFileSize?: number;
  maxFiles?: number;
  consoleOutput?: boolean;
}

export class FileLoggerFactory implements LoggerFactory {
  private readonly options: FileLoggerOptions;
  private readonly loggers: Map<string, FileLogger> = new Map();

  constructor(options: FileLoggerFactoryOptions = {}) {
    this.options = options;
  }

  getLogger(name: string): Logger {
    if (this.loggers.has(name)) {
      return this.loggers.get(name)!;
    }

    const logger = new FileLogger(name, this.options);
    this.loggers.set(name, logger);
    return logger;
  }

  /**
   * Close all loggers and flush pending writes
   */
  closeAll(): void {
    for (const logger of this.loggers.values()) {
      logger.close();
    }
    this.loggers.clear();
  }
}
