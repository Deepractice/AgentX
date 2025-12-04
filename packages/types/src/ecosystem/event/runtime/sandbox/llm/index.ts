/**
 * Sandbox LLM Events
 *
 * Events for LLM (Large Language Model) operations.
 * These events track API calls, streaming, and responses.
 */

import type { RuntimeEvent } from "../../RuntimeEvent";

/**
 * Base LLMEvent
 */
export interface LLMEvent<T extends string = string, D = unknown> extends RuntimeEvent<T, D> {
  source: "sandbox";
  category: "llm";
}

// ============================================================================
// Token Usage
// ============================================================================

/**
 * LLMTokenUsage - Token consumption for LLM call
 */
export interface LLMTokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

// ============================================================================
// LLM Request/Response Events
// ============================================================================

/**
 * LLMRequestEvent - LLM API request started
 */
export interface LLMRequestEvent extends LLMEvent<"llm_request"> {
  intent: "request";
  data: {
    requestId: string;
    model: string;
    messageCount: number;
    hasTools: boolean;
    timestamp: number;
  };
}

/**
 * LLMChunkEvent - LLM streaming chunk received
 */
export interface LLMChunkEvent extends LLMEvent<"llm_chunk"> {
  intent: "notification";
  data: {
    requestId: string;
    chunkType: "text" | "tool_use" | "metadata";
    content?: string;
  };
}

/**
 * LLMResponseEvent - LLM API response completed
 */
export interface LLMResponseEvent extends LLMEvent<"llm_response"> {
  intent: "result";
  data: {
    requestId: string;
    model: string;
    stopReason: string;
    usage: LLMTokenUsage;
    duration: number;
    timestamp: number;
  };
}

/**
 * LLMErrorEvent - LLM API error
 */
export interface LLMErrorEvent extends LLMEvent<"llm_error"> {
  intent: "notification";
  data: {
    requestId: string;
    code: string;
    message: string;
    retryable: boolean;
    timestamp: number;
  };
}

// ============================================================================
// Union Type
// ============================================================================

/**
 * AllLLMEvent - All LLM events
 */
export type AllLLMEvent = LLMRequestEvent | LLMChunkEvent | LLMResponseEvent | LLMErrorEvent;
