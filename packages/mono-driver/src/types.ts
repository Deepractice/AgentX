/**
 * MonoDriver Types
 *
 * MonoDriver = Unified cross-platform Driver
 * - One interface, multiple LLM providers
 * - Powered by Vercel AI SDK
 */

import type { DriverConfig } from "@agentxjs/core/driver";

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
 *
 * For providers that expose an OpenAI-compatible API:
 * - Kimi (Moonshot AI): baseURL = "https://api.moonshot.cn/v1"
 * - GLM (Zhipu AI): baseURL = "https://open.bigmodel.cn/api/paas/v4"
 * - 豆包 (Volcengine): baseURL = "https://ark.cn-beijing.volces.com/api/v3"
 * - Ollama: baseURL = "http://localhost:11434/v1"
 * - LM Studio: baseURL = "http://localhost:1234/v1"
 */
export interface OpenAICompatibleConfig {
  /**
   * Provider name (for logging and identification)
   */
  name: string;

  /**
   * Base URL of the OpenAI-compatible API
   */
  baseURL: string;

  /**
   * API key
   */
  apiKey?: string;
}

/**
 * MonoDriver-specific options
 */
export interface MonoDriverOptions {
  /**
   * LLM Provider
   * @default 'anthropic'
   */
  provider?: MonoProvider;

  /**
   * Max agentic steps for tool calling
   * @default 10
   */
  maxSteps?: number;

  /**
   * Configuration for openai-compatible provider
   *
   * Required when provider is "openai-compatible"
   */
  compatibleConfig?: OpenAICompatibleConfig;
}

/**
 * MonoDriverConfig - DriverConfig with MonoDriverOptions
 */
export type MonoDriverConfig = DriverConfig<MonoDriverOptions>;
