/**
 * RuntimeProvider - Pluggable runtime components
 *
 * Defines which infrastructure components can be injected into Runtime.
 * All fields optional - uses defaults if not provided.
 *
 * @example
 * ```typescript
 * // agentx.config.ts
 * import { defineConfig } from "@deepractice-ai/agentx";
 * import { PostgresRepository } from "@company/agentx-postgres";
 *
 * export default defineConfig({
 *   providers: {
 *     repository: new PostgresRepository(process.env.DATABASE_URL),
 *   }
 * });
 * ```
 */

import type { LLMProvider } from "./sandbox/llm";
import type { Repository } from "./repository";
import type { LoggerFactory } from "~/common/logger";

/**
 * RuntimeProvider - Injectable runtime components
 *
 * All fields are optional. If not provided, Runtime uses default implementations:
 * - llm: EnvLLMProvider (reads from LLM_PROVIDER_KEY env var)
 * - repository: SQLiteRepository (~/.agentx/data/agentx.db)
 * - logger: FileLoggerFactory (~/.agentx/logs/)
 */
export interface RuntimeProvider {
  /**
   * LLM Provider - provides API credentials
   * @default EnvLLMProvider (reads from LLM_PROVIDER_KEY env var)
   */
  llm?: LLMProvider;

  /**
   * Repository - data persistence
   * @default SQLiteRepository (~/.agentx/data/agentx.db)
   */
  repository?: Repository;

  /**
   * Logger Factory - log output
   * @default FileLoggerFactory (~/.agentx/logs/)
   */
  logger?: LoggerFactory;
}
