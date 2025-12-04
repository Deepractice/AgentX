/**
 * @agentxjs/node-ecosystem
 *
 * Node.js implementation of the AgentX Ecosystem
 *
 * Provides:
 * - NodeEcosystem: Main assembly with all components
 * - Environment: ClaudeEnvironment (Receptor + Effector for Claude SDK)
 * - Runtime: Repository, LLM Provider, Logger
 * - SystemBus: Event bus implementation
 *
 * @example
 * ```typescript
 * import { nodeEcosystem } from "@agentxjs/node-ecosystem";
 *
 * const ecosystem = nodeEcosystem();
 *
 * ecosystem.bus.onAny((event) => {
 *   console.log("Event:", event.type);
 * });
 * ```
 */

// Main assembly
export { NodeEcosystem, nodeEcosystem, type NodeEcosystemConfig } from "./NodeEcosystem";

// Environment
export {
  ClaudeEnvironment,
  ClaudeReceptor,
  ClaudeEffector,
  buildOptions,
  type ClaudeEnvironmentConfig,
  type ClaudeEffectorConfig,
  type EnvironmentContext,
} from "./environment";

// Runtime
export {
  SQLiteRepository,
  EnvLLMProvider,
  FileLogger,
  FileLoggerFactory,
  type LLMSupply,
  type FileLoggerOptions,
  type FileLoggerFactoryOptions,
} from "./runtime";

// SystemBus
export { SystemBusImpl } from "./SystemBusImpl";

// Utils
export { generateId } from "./utils";
