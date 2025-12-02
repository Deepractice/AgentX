/**
 * BrowserLoggerFactory - Factory for creating BrowserLogger instances
 *
 * Creates styled console loggers for browser environments.
 * Used by SSERuntime to provide browser-optimized logging.
 */

import type { Logger, LoggerFactory, LogLevel } from "@deepractice-ai/agentx-types";
import { BrowserLogger, type BrowserLoggerOptions } from "./BrowserLogger";

export interface BrowserLoggerFactoryOptions {
  level?: LogLevel;
  collapsed?: boolean;
}

export class BrowserLoggerFactory implements LoggerFactory {
  private readonly options: BrowserLoggerOptions;
  private readonly loggers: Map<string, BrowserLogger> = new Map();

  constructor(options: BrowserLoggerFactoryOptions = {}) {
    this.options = options;
  }

  getLogger(name: string): Logger {
    if (this.loggers.has(name)) {
      return this.loggers.get(name)!;
    }

    const logger = new BrowserLogger(name, this.options);
    this.loggers.set(name, logger);
    return logger;
  }
}
