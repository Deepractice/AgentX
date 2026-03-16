/**
 * Presentation Types
 *
 * UI-friendly data model aggregated from stream events.
 * This implements the Presentation Model pattern.
 */

// ============================================================================
// Block Types - Basic content units
// ============================================================================

/**
 * Text block
 */
export interface TextBlock {
  type: "text";
  content: string;
}

/**
 * Tool block - represents a tool call and its result
 */
export interface ToolBlock {
  type: "tool";
  toolUseId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  toolResult?: string;
  /** Partial JSON input being streamed (visible during input-streaming phase) */
  partialInput?: string;
  status: "pending" | "running" | "completed" | "error" | "interrupted";
}

/**
 * Image block
 */
export interface ImageBlock {
  type: "image";
  url: string;
  alt?: string;
}

/**
 * File block
 */
export interface FileBlock {
  type: "file";
  filename: string;
  mediaType: string;
}

/**
 * Thinking/reasoning block — AI's internal reasoning process
 */
export interface ThinkingBlock {
  type: "thinking";
  content: string;
}

/**
 * All block types
 */
export type Block = TextBlock | ToolBlock | ImageBlock | FileBlock | ThinkingBlock;

// ============================================================================
// Conversation Types - A single turn in the conversation
// ============================================================================

/**
 * User conversation
 */
export interface UserConversation {
  role: "user";
  blocks: Block[];
}

/**
 * Token usage for a message (one LLM call / step)
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

/**
 * Assistant conversation
 */
export interface AssistantConversation {
  role: "assistant";
  blocks: Block[];
  isStreaming: boolean;
  /** Accumulated token usage across all steps in this conversation */
  usage?: TokenUsage;
}

/**
 * Error conversation
 */
export interface ErrorConversation {
  role: "error";
  message: string;
}

/**
 * All conversation types
 */
export type Conversation = UserConversation | AssistantConversation | ErrorConversation;

// ============================================================================
// Presentation Metrics
// ============================================================================

/**
 * Turn-level metrics.
 * Reset at the start of each turn, preserved after turn ends.
 */
export interface TurnMetrics {
  /** Timestamp when the current turn started (null when idle before first turn) */
  turnStartedAt: number | null;
  /** Input tokens consumed in the current turn */
  inputTokens: number;
  /** Output tokens generated in the current turn */
  outputTokens: number;
}

/**
 * Session-level context metrics.
 * Tracks the overall context window usage across the entire session.
 */
export interface SessionMetrics {
  /** Current context size in tokens (last inputTokens from LLM — includes full history) */
  contextTokens: number;
  /** Model's context window limit (0 = unknown) */
  contextLimit: number;
  /** Context usage ratio 0-1 (0 when limit unknown) */
  contextUsage: number;
}

/**
 * Combined presentation metrics — turn + session level.
 */
export interface PresentationMetrics extends TurnMetrics {
  /** Session-level context window metrics */
  session: SessionMetrics;
}

// ============================================================================
// Presentation State
// ============================================================================

/**
 * Connection state
 */
export type ConnectionState = "connected" | "connecting" | "disconnected";

/**
 * Presentation state - the complete UI state
 */
export interface PresentationState {
  /**
   * All conversations including the currently streaming one.
   * The streaming conversation is the last item with `isStreaming: true`.
   * Frontend just does `conversations.map(...)` — no merging needed.
   */
  conversations: Conversation[];

  /**
   * Current agent status
   */
  status: "idle" | "thinking" | "responding" | "executing";

  /**
   * WebSocket connection state
   */
  connection: ConnectionState;

  /**
   * Real-time metrics for the current turn
   */
  metrics: PresentationMetrics;
}

/**
 * Initial presentation metrics
 */
export const initialSessionMetrics: SessionMetrics = {
  contextTokens: 0,
  contextLimit: 0,
  contextUsage: 0,
};

export const initialMetrics: PresentationMetrics = {
  turnStartedAt: null,
  inputTokens: 0,
  outputTokens: 0,
  session: initialSessionMetrics,
};

/**
 * Initial presentation state
 */
export const initialPresentationState: PresentationState = {
  conversations: [],
  status: "idle",
  connection: "connected",
  metrics: initialMetrics,
};
