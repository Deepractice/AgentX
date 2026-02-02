/**
 * LLMProvider - Large Language Model Supply Service
 *
 * Provides LLM configuration at Runtime level.
 * All Agents in the Runtime share the same LLMProvider.
 */

/**
 * LLMProvider - Large Language Model supply service
 *
 * @typeParam TSupply - Supply type (config, client, token, etc.)
 */
export interface LLMProvider<TSupply = unknown> {
  /**
   * Provider identifier (e.g., "claude", "openai")
   */
  readonly name: string;

  /**
   * Provide LLM configuration
   */
  provide(): TSupply;
}

/**
 * ClaudeLLMConfig - Configuration for Claude LLM
 */
export interface ClaudeLLMConfig {
  /**
   * Anthropic API key
   */
  apiKey: string;

  /**
   * API base URL (optional, for custom endpoints)
   */
  baseUrl?: string;

  /**
   * Model name (e.g., "claude-sonnet-4-20250514")
   */
  model?: string;
}

/**
 * Type alias for Claude LLM Provider
 */
export type ClaudeLLMProvider = LLMProvider<ClaudeLLMConfig>;
