/**
 * @Logger Decorator
 *
 * Property decorator that injects a LoggerProvider instance.
 * Similar to SLF4J's @Slf4j annotation in Spring/Lombok.
 *
 * @example
 * ```typescript
 * class MyService {
 *   @Logger()
 *   private logger!: LoggerProvider;
 *
 *   doSomething() {
 *     this.logger.info("Hello from MyService");
 *   }
 * }
 * ```
 */

import { LoggerFactory } from "~/core";

/**
 * Logger decorator options
 */
export interface LoggerOptions {
  /**
   * Custom logger name (defaults to class name)
   */
  name?: string;
}

/**
 * @Logger() decorator
 *
 * Injects a LoggerProvider instance into the decorated property.
 * The logger is created using LoggerFactory with the class name.
 *
 * @param options - Optional configuration
 * @returns Property decorator
 *
 * @example
 * ```typescript
 * class MyService {
 *   @Logger()
 *   private logger!: LoggerProvider;
 *
 *   // With custom name
 *   @Logger({ name: "CustomLogger" })
 *   private customLogger!: LoggerProvider;
 *
 *   doSomething() {
 *     this.logger.info("Using class name as logger name");
 *     this.customLogger.info("Using custom logger name");
 *   }
 * }
 * ```
 */
export function Logger(options?: LoggerOptions): PropertyDecorator {
  return function (target: any, propertyKey: string | symbol): void {
    // Lazy initialization getter
    // Will determine logger name when first accessed
    let cachedLogger: any = null;

    Object.defineProperty(target, propertyKey, {
      get: function (this: any) {
        if (!cachedLogger) {
          // Determine logger name: custom name > class name > "Unknown"
          const loggerName =
            options?.name || this.constructor?.name || target.constructor?.name || "Unknown";
          cachedLogger = LoggerFactory.getLogger(loggerName);
        }
        return cachedLogger;
      },
      enumerable: true,
      configurable: true,
    });
  };
}
