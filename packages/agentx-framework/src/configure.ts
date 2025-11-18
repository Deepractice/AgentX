/**
 * AgentX Framework Global Configuration
 *
 * Provides a unified entry point for configuring framework-level settings.
 * This includes logger configuration, error handling, and other global settings.
 *
 * @example
 * ```typescript
 * import { configure, LogLevel } from "@deepractice-ai/agentx-framework";
 *
 * // Configure in application entry point
 * configure({
 *   logger: {
 *     defaultLevel: LogLevel.DEBUG,
 *     defaultImplementation: (name) => new PinoLogger(name)
 *   }
 * });
 * ```
 */

import { LoggerFactory, type LoggerFactoryConfig } from "@deepractice-ai/agentx-logger";

/**
 * AgentX Framework Configuration
 */
export interface AgentXConfig {
  /**
   * Logger configuration
   *
   * Configures the global LoggerFactory used by all AgentX components.
   *
   * @example
   * ```typescript
   * configure({
   *   logger: {
   *     defaultLevel: LogLevel.INFO,
   *     defaultImplementation: (name) => new PinoLogger(name)
   *   }
   * });
   * ```
   */
  logger?: LoggerFactoryConfig;

  /**
   * Global error handler (future feature)
   *
   * @example
   * ```typescript
   * configure({
   *   errorHandler: (error) => {
   *     Sentry.captureException(error);
   *   }
   * });
   * ```
   */
  errorHandler?: (error: Error) => void;

  /**
   * Performance monitoring configuration (future feature)
   */
  performance?: {
    enabled: boolean;
    sampleRate?: number;
  };

  /**
   * Debug mode (future feature)
   */
  debug?: boolean;
}

/**
 * Configure AgentX framework globally
 *
 * This should be called once in your application entry point, before creating
 * any agents or other AgentX components.
 *
 * @param config - Framework configuration
 *
 * @example Basic usage
 * ```typescript
 * import { configure, LogLevel } from "@deepractice-ai/agentx-framework";
 *
 * configure({
 *   logger: {
 *     defaultLevel: LogLevel.DEBUG
 *   }
 * });
 * ```
 *
 * @example Custom logger implementation
 * ```typescript
 * import { configure, LogLevel } from "@deepractice-ai/agentx-framework";
 * import pino from "pino";
 *
 * configure({
 *   logger: {
 *     defaultLevel: LogLevel.INFO,
 *     defaultImplementation: (name) => new PinoLoggerAdapter(name)
 *   }
 * });
 * ```
 *
 * @example Development configuration
 * ```typescript
 * configure({
 *   logger: {
 *     defaultLevel: LogLevel.DEBUG,
 *     consoleOptions: {
 *       colors: true,
 *       timestamps: true
 *     }
 *   },
 *   debug: true
 * });
 * ```
 *
 * @example Production configuration
 * ```typescript
 * configure({
 *   logger: {
 *     defaultLevel: LogLevel.INFO,
 *     defaultImplementation: (name) => new PinoLogger(name)
 *   },
 *   performance: {
 *     enabled: true,
 *     sampleRate: 0.1
 *   }
 * });
 * ```
 *
 * @example Test configuration
 * ```typescript
 * configure({
 *   logger: {
 *     defaultLevel: LogLevel.SILENT
 *   }
 * });
 * ```
 */
export function configure(config: AgentXConfig): void {
  // Configure logger
  if (config.logger) {
    LoggerFactory.configure(config.logger);
  }

  // Future: Configure error handler
  if (config.errorHandler) {
    // TODO: Set global error handler
    console.warn("[AgentX] Global error handler configuration not yet implemented");
  }

  // Future: Configure performance monitoring
  if (config.performance) {
    // TODO: Enable performance monitoring
    console.warn("[AgentX] Performance monitoring configuration not yet implemented");
  }

  // Future: Configure debug mode
  if (config.debug !== undefined) {
    // TODO: Set debug mode
    console.warn("[AgentX] Debug mode configuration not yet implemented");
  }
}
