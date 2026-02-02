/**
 * LLM Context - Language Model types
 *
 * Defines the type system for stateless language model inference.
 *
 * NOTE: These types are reserved definitions and may not be used.
 * Currently we integrate LLM through Claude SDK (Anthropic SDK) rather than
 * directly implementing LLM abstraction. The actual LLM interaction is handled
 * by ClaudeDriver which uses the Anthropic SDK internally.
 *
 * These types are kept for:
 * - Future multi-provider support (OpenAI, Gemini, etc.)
 * - Documentation of the conceptual LLM interface
 * - Potential abstraction layer if needed
 */

export type { LLM } from "./LLM";
export type { LLMConfig } from "./LLMConfig";
export type { LLMRequest } from "./LLMRequest";
export type { LLMResponse } from "./LLMResponse";
export type { StopReason } from "./StopReason";
export { isStopReason } from "./StopReason";
export type { StreamChunk, TextChunk, ThinkingChunk, ToolUseChunk } from "./StreamChunk";
export type { TokenUsage } from "./TokenUsage";

// LLM Provider interface (at container level, parallel to Sandbox)
export type { LLMProvider } from "./LLMProvider";
