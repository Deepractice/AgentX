/**
 * Node Runtime Provider Factories
 *
 * Factory functions for creating runtime providers with strong typing.
 *
 * @example
 * ```typescript
 * import { nodeRuntime, envLLM, sqlite, fileLogger } from "@deepractice-ai/agentx/runtime/node";
 *
 * createAgentX(nodeRuntime({
 *   llm: envLLM({ model: "claude-sonnet-4" }),
 *   repository: sqlite({ path: "/custom/db.sqlite" }),
 *   logger: fileLogger({ level: "debug" }),
 * }));
 * ```
 */

import type {
  LLMProvider,
  Repository,
  LoggerFactory,
  LogLevel,
} from "@deepractice-ai/agentx-types";
import { EnvLLMProvider, type LLMSupply } from "./llm";
import { SQLiteRepository } from "./repository";
import { FileLoggerFactory } from "./logger";
import { homedir } from "node:os";
import { join } from "node:path";

// ============================================================================
// LLM Provider Factory
// ============================================================================

/**
 * EnvLLM configuration
 */
export interface EnvLLMConfig {
  /**
   * API key (overrides LLM_PROVIDER_KEY env var)
   */
  apiKey?: string;

  /**
   * Base URL (overrides LLM_PROVIDER_URL env var)
   */
  baseUrl?: string;

  /**
   * Model name (overrides LLM_PROVIDER_MODEL env var)
   * @default "claude-sonnet-4-20250514"
   */
  model?: string;
}

/**
 * Create an LLM provider that reads from environment variables
 *
 * Environment Variables:
 * - LLM_PROVIDER_KEY (required) - API key
 * - LLM_PROVIDER_URL (optional) - Base URL
 * - LLM_PROVIDER_MODEL (optional) - Model name
 *
 * @example
 * ```typescript
 * // Use environment variables
 * envLLM()
 *
 * // Override specific values
 * envLLM({ model: "claude-sonnet-4" })
 * ```
 */
export function envLLM(config?: EnvLLMConfig): LLMProvider<LLMSupply> {
  const provider = new EnvLLMProvider();

  // If config provided, wrap to override values
  if (config && (config.apiKey || config.baseUrl || config.model)) {
    return {
      name: "env",
      provide: () => {
        const base = provider.provide();
        return {
          apiKey: config.apiKey ?? base.apiKey,
          baseUrl: config.baseUrl ?? base.baseUrl,
          model: config.model ?? base.model,
        };
      },
    };
  }

  return provider;
}

// ============================================================================
// Repository Factory
// ============================================================================

/**
 * SQLite repository configuration
 */
export interface SQLiteConfig {
  /**
   * Path to SQLite database file
   * @default "~/.agentx/data/agentx.db"
   */
  path?: string;
}

/**
 * Create a SQLite repository
 *
 * @example
 * ```typescript
 * // Use default path
 * sqlite()
 *
 * // Custom path
 * sqlite({ path: "/custom/path/db.sqlite" })
 * ```
 */
export function sqlite(config?: SQLiteConfig): Repository {
  const defaultPath = join(homedir(), ".agentx", "data", "agentx.db");
  return new SQLiteRepository(config?.path ?? defaultPath);
}

// ============================================================================
// Logger Factory
// ============================================================================

/**
 * File logger configuration
 */
export interface FileLoggerConfig {
  /**
   * Log level
   * @default "info"
   */
  level?: LogLevel;

  /**
   * Log directory
   * @default "~/.agentx/logs"
   */
  dir?: string;

  /**
   * Max file size before rotation (bytes)
   * @default 10MB
   */
  maxFileSize?: number;

  /**
   * Max number of rotated files to keep
   * @default 5
   */
  maxFiles?: number;

  /**
   * Also output to console
   * @default true
   */
  console?: boolean;
}

/**
 * Create a file logger factory
 *
 * @example
 * ```typescript
 * // Use defaults
 * fileLogger()
 *
 * // Custom configuration
 * fileLogger({ level: "debug", dir: "/custom/logs" })
 * ```
 */
export function fileLogger(config?: FileLoggerConfig): LoggerFactory {
  const defaultDir = join(homedir(), ".agentx", "logs");
  return new FileLoggerFactory({
    level: config?.level,
    logDir: config?.dir ?? defaultDir,
    maxFileSize: config?.maxFileSize,
    maxFiles: config?.maxFiles,
    consoleOutput: config?.console ?? true,
  });
}
