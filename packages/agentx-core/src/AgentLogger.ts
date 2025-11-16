/**
 * AgentLogger Interface
 *
 * Platform-specific logging implementation interface for Agent.
 * Different platforms (Node.js, Browser) implement this interface differently.
 *
 * Logger's responsibility: Implement standard logging patterns for the platform.
 *
 * Examples:
 * - NodeAgentLogger: Uses console with colors/timestamps
 * - BrowserAgentLogger: Uses console with browser DevTools styles
 * - CloudAgentLogger: Sends structured logs to cloud services
 * - SilentAgentLogger: No-op implementation for production
 *
 * Key principle: Core defines the standard, loggers adapt to platform capabilities.
 */

/**
 * Log level enum
 */
export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

/**
 * Log context interface
 *
 * Provides structured context information for log entries.
 * Context is optional and can include any additional metadata.
 */
export interface LogContext {
  /**
   * Agent instance identifier
   */
  agentId?: string;

  /**
   * Session identifier
   */
  sessionId?: string;

  /**
   * Provider session identifier (internal)
   */
  providerSessionId?: string;

  /**
   * Message identifier
   */
  messageId?: string;

  /**
   * Error object (for error logs)
   */
  error?: Error;

  /**
   * Additional metadata
   */
  [key: string]: any;
}

/**
 * AgentLogger interface
 *
 * Platform-specific implementation must implement this interface.
 * Logger is responsible for formatting and outputting logs according to platform capabilities.
 *
 * Supports multiple logging styles:
 * 1. Simple string: logger.info("message")
 * 2. String with context: logger.info("message", { agentId: "123" })
 * 3. Template string: logger.info("Agent %s created at %d", agentId, timestamp)
 * 4. Variadic arguments: logger.info("Agent", agentId, "created", { config })
 */
export interface AgentLogger {
  /**
   * Log a message at specified level
   *
   * Supports multiple call signatures:
   * - log(level, message)
   * - log(level, message, context)
   * - log(level, template, ...args)
   *
   * @param level - Log level
   * @param message - Log message or template string
   * @param args - Additional arguments (context object or template args)
   *
   * @example
   * ```typescript
   * // Simple string
   * logger.log(LogLevel.INFO, "Agent created");
   *
   * // String with context
   * logger.log(LogLevel.INFO, "Agent created", { agentId: "agent_123" });
   *
   * // Template string (printf-style)
   * logger.log(LogLevel.INFO, "Agent %s created at %d", "agent_123", Date.now());
   *
   * // Variadic arguments
   * logger.log(LogLevel.INFO, "Agent", "agent_123", "created", { timestamp: Date.now() });
   * ```
   */
  log(level: LogLevel, message: string, ...args: any[]): void;

  /**
   * Log a debug message
   *
   * Supports multiple call signatures:
   * - debug(message)
   * - debug(message, context)
   * - debug(template, ...args)
   *
   * @param message - Debug message or template string
   * @param args - Additional arguments (context object or template args)
   *
   * @example
   * ```typescript
   * // Simple string
   * logger.debug("Processing message");
   *
   * // String with context
   * logger.debug("Processing message", { sessionId: "session_456" });
   *
   * // Template string
   * logger.debug("Processing message %s for session %s", msgId, sessionId);
   *
   * // Variadic arguments
   * logger.debug("Processing", message, "for", session);
   * ```
   */
  debug(message: string, ...args: any[]): void;

  /**
   * Log an info message
   *
   * Supports multiple call signatures:
   * - info(message)
   * - info(message, context)
   * - info(template, ...args)
   *
   * @param message - Info message or template string
   * @param args - Additional arguments (context object or template args)
   *
   * @example
   * ```typescript
   * // Simple string
   * logger.info("Agent started");
   *
   * // String with context
   * logger.info("Agent started", { agentId: "agent_123" });
   *
   * // Template string
   * logger.info("Agent %s started with config %o", agentId, config);
   *
   * // Variadic arguments
   * logger.info("Agent", agentId, "started", config);
   * ```
   */
  info(message: string, ...args: any[]): void;

  /**
   * Log a warning message
   *
   * Supports multiple call signatures:
   * - warn(message)
   * - warn(message, context)
   * - warn(template, ...args)
   *
   * @param message - Warning message or template string
   * @param args - Additional arguments (context object or template args)
   *
   * @example
   * ```typescript
   * // Simple string
   * logger.warn("Rate limit approaching");
   *
   * // String with context
   * logger.warn("Rate limit approaching", { remainingRequests: 10 });
   *
   * // Template string
   * logger.warn("Rate limit: %d/%d requests remaining", remaining, total);
   *
   * // Variadic arguments
   * logger.warn("Rate limit:", remaining, "/", total, "remaining");
   * ```
   */
  warn(message: string, ...args: any[]): void;

  /**
   * Log an error message
   *
   * Supports multiple call signatures:
   * - error(message)
   * - error(message, context)
   * - error(template, ...args)
   * - error(message, error)
   *
   * @param message - Error message or template string
   * @param args - Additional arguments (context object, error, or template args)
   *
   * @example
   * ```typescript
   * // Simple string
   * logger.error("Failed to send message");
   *
   * // String with context
   * logger.error("Failed to send message", {
   *   agentId: "agent_123",
   *   error: new Error("Network timeout")
   * });
   *
   * // String with Error object
   * logger.error("Failed to send message", new Error("Network timeout"));
   *
   * // Template string
   * logger.error("Failed to send message to %s: %s", agentId, error.message);
   *
   * // Variadic arguments
   * logger.error("Failed:", operation, error);
   * ```
   */
  error(message: string, ...args: any[]): void;

  /**
   * Create a child logger with bound context
   *
   * Child logger inherits parent's configuration and merges contexts.
   * Useful for creating session-scoped or agent-scoped loggers.
   *
   * @param context - Context to bind to child logger
   * @returns New logger instance with bound context
   *
   * @example
   * ```typescript
   * const sessionLogger = logger.withContext({
   *   agentId: "agent_123",
   *   sessionId: "session_456"
   * });
   *
   * // All logs from sessionLogger will include agentId and sessionId
   * sessionLogger.info("Message sent");
   * // Output: [INFO] Message sent { agentId: "agent_123", sessionId: "session_456" }
   * ```
   */
  withContext(context: LogContext): AgentLogger;

  /**
   * Set log level filter
   *
   * Only logs at or above this level will be output.
   * Default level is platform-dependent.
   *
   * @param level - Minimum log level to output
   *
   * @example
   * ```typescript
   * logger.setLevel(LogLevel.WARN); // Only warn and error will be logged
   * ```
   */
  setLevel(level: LogLevel): void;

  /**
   * Check if a log level is enabled
   *
   * @param level - Log level to check
   * @returns True if level is enabled
   *
   * @example
   * ```typescript
   * if (logger.isLevelEnabled(LogLevel.DEBUG)) {
   *   // Perform expensive debug computation
   *   const debugInfo = computeExpensiveDebugInfo();
   *   logger.debug(debugInfo);
   * }
   * ```
   */
  isLevelEnabled(level: LogLevel): boolean;
}

/**
 * Standard log message formatters
 *
 * Provides consistent formatting for common log patterns.
 * Optional utilities for standardizing log messages across implementations.
 */
export class LogFormatter {
  /**
   * Format agent lifecycle event
   *
   * @example
   * ```typescript
   * LogFormatter.agentLifecycle("created", "agent_123")
   * // Returns: "Agent created: agent_123"
   * ```
   */
  static agentLifecycle(event: string, agentId: string): string {
    return `Agent ${event}: ${agentId}`;
  }

  /**
   * Format session lifecycle event
   *
   * @example
   * ```typescript
   * LogFormatter.sessionLifecycle("started", "session_456", "agent_123")
   * // Returns: "Session started: session_456 (agent_123)"
   * ```
   */
  static sessionLifecycle(event: string, sessionId: string, agentId?: string): string {
    const agentPart = agentId ? ` (${agentId})` : "";
    return `Session ${event}: ${sessionId}${agentPart}`;
  }

  /**
   * Format message flow event
   *
   * @example
   * ```typescript
   * LogFormatter.messageFlow("user", "Hello, how are you?")
   * // Returns: "Message [user]: Hello, how are you?"
   *
   * LogFormatter.messageFlow("assistant", "I'm doing well, thank you for asking!")
   * // Returns: "Message [assistant]: I'm doing well, thank you for asking!"
   * ```
   */
  static messageFlow(role: "user" | "assistant", content: string, maxLength = 50): string {
    const preview = content.length > maxLength ? `${content.substring(0, maxLength)}...` : content;
    return `Message [${role}]: ${preview}`;
  }

  /**
   * Format event emission
   *
   * @example
   * ```typescript
   * LogFormatter.eventEmission("user", "session_456")
   * // Returns: "Event emitted: user (session_456)"
   * ```
   */
  static eventEmission(eventType: string, sessionId?: string): string {
    const sessionPart = sessionId ? ` (${sessionId})` : "";
    return `Event emitted: ${eventType}${sessionPart}`;
  }

  /**
   * Format error
   *
   * @example
   * ```typescript
   * LogFormatter.error("Network timeout", new Error("Connection failed"))
   * // Returns: "Error: Network timeout - Connection failed"
   * ```
   */
  static error(message: string, error: Error): string {
    return `Error: ${message} - ${error.message}`;
  }

  /**
   * Format provider operation
   *
   * @example
   * ```typescript
   * LogFormatter.providerOperation("ClaudeProvider", "send", "started")
   * // Returns: "Provider [ClaudeProvider] send: started"
   * ```
   */
  static providerOperation(providerName: string, operation: string, status: string): string {
    return `Provider [${providerName}] ${operation}: ${status}`;
  }

  /**
   * Format context as string
   *
   * Useful for displaying context in log messages.
   *
   * @example
   * ```typescript
   * LogFormatter.formatContext({ agentId: "agent_123", sessionId: "session_456" })
   * // Returns: "{ agentId: agent_123, sessionId: session_456 }"
   * ```
   */
  static formatContext(context: LogContext): string {
    const entries = Object.entries(context)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => {
        if (value instanceof Error) {
          return `${key}: ${value.message}`;
        }
        if (typeof value === "object") {
          return `${key}: ${JSON.stringify(value)}`;
        }
        return `${key}: ${value}`;
      });

    return entries.length > 0 ? `{ ${entries.join(", ")} }` : "";
  }
}
