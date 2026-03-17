/**
 * MonoDriver Types
 *
 * MonoDriver = Unified cross-platform Driver
 * - One interface, multiple LLM providers
 * - Powered by Vercel AI SDK
 */

import type { AgentContext } from "@agentxjs/core/driver";

/**
 * Built-in LLM providers
 */
export type MonoBuiltinProvider =
  | "anthropic"
  | "openai"
  | "google"
  | "xai"
  | "deepseek"
  | "mistral";

/**
 * Supported LLM providers
 *
 * Built-in providers + "openai-compatible" for any OpenAI-compatible API
 * (Kimi, GLM, 豆包, Ollama, LM Studio, etc.)
 */
export type MonoProvider = MonoBuiltinProvider | "openai-compatible";

/**
 * OpenAI-compatible provider configuration
 */
export interface OpenAICompatibleConfig {
  /** Provider name (for logging and identification) */
  name: string;
  /** Base URL of the OpenAI-compatible API */
  baseURL: string;
  /** API key */
  apiKey?: string;
}

/**
 * MonoDriver-specific options
 */
export interface MonoDriverOptions {
  /** LLM Provider @default 'anthropic' */
  provider?: MonoProvider;
  /** Max agentic steps for tool calling @default 10 */
  maxSteps?: number;
  /** Configuration for openai-compatible provider */
  compatibleConfig?: OpenAICompatibleConfig;
}

/**
 * MonoDriverConfig - AgentContext with MonoDriverOptions
 */
export type MonoDriverConfig = AgentContext & MonoDriverOptions;
