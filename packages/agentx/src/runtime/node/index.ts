/**
 * AgentX Node Runtime
 *
 * "Define Once, Run Anywhere"
 *
 * Node.js Runtime for AgentX with Claude driver.
 * Supports dependency injection via factory functions.
 *
 * @example
 * ```typescript
 * import { createAgentX } from "@deepractice-ai/agentx";
 * import { nodeRuntime, envLLM, sqlite } from "@deepractice-ai/agentx/runtime/node";
 *
 * // Use all defaults (reads from environment)
 * createAgentX(nodeRuntime());
 *
 * // Custom configuration
 * createAgentX(nodeRuntime({
 *   llm: envLLM({ model: "claude-sonnet-4" }),
 *   repository: sqlite({ path: "/custom/db.sqlite" }),
 * }));
 * ```
 *
 * Environment Variables (for default envLLM):
 * - LLM_PROVIDER_KEY (required) - API key for LLM provider
 * - LLM_PROVIDER_URL (optional) - Base URL for API endpoint
 * - LLM_PROVIDER_MODEL (optional, defaults to claude-sonnet-4-20250514)
 *
 * @packageDocumentation
 */

// ==================== Runtime Factory (Primary API) ====================
export { nodeRuntime, runtime, NodeRuntime, type NodeRuntimeConfig } from "./NodeRuntime";

// ==================== Provider Factories ====================
export {
  envLLM,
  sqlite,
  fileLogger,
  type EnvLLMConfig,
  type SQLiteConfig,
  type FileLoggerConfig,
} from "./providers";

// ==================== Advanced: Direct Class Access ====================
export { EnvLLMProvider, type LLMSupply } from "./llm";
export { SQLiteRepository } from "./repository";
export { FileLogger, type FileLoggerOptions } from "./logger";
export { FileLoggerFactory, type FileLoggerFactoryOptions } from "./logger";

// ==================== Driver (for advanced use) ====================
export { createClaudeDriver, type ClaudeDriverConfig, type ClaudeDriverOptions } from "./driver";
