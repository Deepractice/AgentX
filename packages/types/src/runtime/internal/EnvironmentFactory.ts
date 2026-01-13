/**
 * EnvironmentFactory - Factory for creating Environment instances
 *
 * Enables dependency injection for testing (e.g., MockEnvironment).
 */

import type { Environment } from "./environment";
import type { ClaudeLLMConfig } from "../llm";

/**
 * Configuration for creating an Environment
 */
export interface EnvironmentCreateConfig {
  /** Agent ID that will use this environment */
  agentId: string;

  /** LLM configuration (API key, model, etc.) */
  llmConfig: ClaudeLLMConfig;

  /** System prompt for the agent */
  systemPrompt?: string;

  /** Current working directory for sandbox */
  cwd: string;

  /** Session ID to resume (if reconnecting) */
  resumeSessionId?: string;

  /** MCP servers configuration */
  mcpServers?: Record<string, unknown>;

  /** Callback when Claude SDK session ID is captured */
  onSessionIdCaptured?: (sessionId: string) => void;
}

/**
 * Factory interface for creating Environment instances
 *
 * Used for dependency injection (e.g., MockEnvironment for BDD tests).
 */
export interface EnvironmentFactory {
  /**
   * Create an Environment instance
   * @param config - Configuration for the environment
   * @returns Environment instance
   */
  create(config: EnvironmentCreateConfig): Environment;
}
