/**
 * LLM Provider Types
 *
 * LLM Provider is the configuration layer for LLM services.
 * Separates vendor (who provides) from protocol (API format).
 *
 * Architecture:
 * ```
 * AgentX Runtime
 *   ↓
 * Driver (SDK adapter: how to talk to LLM)
 *   ↓
 * LLM Provider Config (which LLM to talk to)
 * ```
 */

// ============================================================================
// Re-export from persistence (storage schema)
// ============================================================================

export type {
  LLMProtocol,
  LLMProviderRecord,
  LLMProviderRepository,
} from "../persistence/types";

// ============================================================================
// LLM Provider Create/Update Config
// ============================================================================

/**
 * Configuration for creating a new LLM provider
 */
export interface LLMProviderCreateConfig {
  /** Display name */
  name: string;

  /** Vendor - who provides the service */
  vendor: string;

  /** Protocol - API format */
  protocol: "anthropic" | "openai";

  /** API key */
  apiKey: string;

  /** Custom base URL */
  baseUrl?: string;

  /** Default model */
  model?: string;
}

/**
 * Fields that can be updated on an LLM provider
 */
export interface LLMProviderUpdateConfig {
  name?: string;
  vendor?: string;
  protocol?: "anthropic" | "openai";
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}
