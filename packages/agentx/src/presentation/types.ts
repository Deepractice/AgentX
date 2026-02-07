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
  status: "pending" | "running" | "completed" | "error";
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
 * All block types
 */
export type Block = TextBlock | ToolBlock | ImageBlock;

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
// Presentation State
// ============================================================================

/**
 * Presentation state - the complete UI state
 */
export interface PresentationState {
  /**
   * All completed conversations
   */
  conversations: Conversation[];

  /**
   * Current streaming conversation (null if not streaming)
   */
  streaming: AssistantConversation | null;

  /**
   * Current status
   */
  status: "idle" | "thinking" | "responding" | "executing";
}

/**
 * Initial presentation state
 */
export const initialPresentationState: PresentationState = {
  conversations: [],
  streaming: null,
  status: "idle",
};
