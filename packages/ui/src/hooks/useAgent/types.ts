/**
 * Types for useAgent hook
 *
 * Unified message state management with reducer pattern.
 */

import type { Message, AgentState, ToolCallMessage, ToolResultMessage } from "agentxjs";

// ============================================================================
// Status Types
// ============================================================================

/**
 * Agent status - use AgentState from agentxjs
 */
export type AgentStatus = AgentState;

/**
 * Status for user messages
 */
export type UserMessageStatus = "pending" | "success" | "error" | "interrupted";

/**
 * Status for assistant messages (4-state lifecycle)
 */
export type AssistantMessageStatus = "queued" | "thinking" | "responding" | "completed";

// ============================================================================
// Render Message Types
// ============================================================================

/**
 * Tool result embedded in tool-call message
 */
export interface EmbeddedToolResult {
  output: unknown;
  duration?: number;
}

/**
 * Base render message
 */
interface BaseRenderMessage {
  id: string;
  timestamp: number;
}

/**
 * User message for rendering
 */
export interface RenderUserMessage extends BaseRenderMessage {
  role: "user";
  subtype: "user";
  content: string;
  status: UserMessageStatus;
  errorCode?: string;
}

/**
 * Assistant message for rendering
 */
export interface RenderAssistantMessage extends BaseRenderMessage {
  role: "assistant";
  subtype: "assistant";
  content: string;
  status: AssistantMessageStatus;
}

/**
 * Tool call message for rendering (with embedded result)
 */
export interface RenderToolCallMessage extends BaseRenderMessage {
  role: "assistant";
  subtype: "tool-call";
  toolCall: {
    id: string;
    name: string;
    input: unknown;
  };
  toolResult?: EmbeddedToolResult;
}

/**
 * Error message for rendering
 */
export interface RenderErrorMessage extends BaseRenderMessage {
  role: "system";
  subtype: "error";
  content: string;
}

/**
 * Union type for all render messages
 */
export type RenderMessage =
  | RenderUserMessage
  | RenderAssistantMessage
  | RenderToolCallMessage
  | RenderErrorMessage;

// ============================================================================
// Message State
// ============================================================================

/**
 * Pending assistant state
 */
export interface PendingAssistant {
  id: string;
  status: "queued" | "thinking" | "responding";
}

/**
 * Message state managed by reducer
 */
export interface MessageState {
  /** Ordered list of render messages */
  messages: RenderMessage[];

  /** Current pending assistant (if any) */
  pendingAssistant: PendingAssistant | null;

  /** Streaming text for responding state */
  streaming: string;

  /** Set of message IDs for deduplication */
  messageIds: Set<string>;

  /** Map of toolCallId -> message index for pairing */
  pendingToolCalls: Map<string, number>;

  /** Errors */
  errors: UIError[];

  /** Agent status */
  agentStatus: AgentStatus;
}

/**
 * Actions for message reducer
 */
export type MessageAction =
  | { type: "LOAD_HISTORY"; messages: Message[] }
  | { type: "RESET" }
  | { type: "USER_MESSAGE_ADD"; message: RenderUserMessage }
  | { type: "USER_MESSAGE_STATUS"; status: UserMessageStatus; errorCode?: string }
  | { type: "PENDING_ASSISTANT_ADD"; id: string }
  | { type: "PENDING_ASSISTANT_STATUS"; status: "thinking" | "responding" }
  | { type: "TEXT_DELTA"; text: string }
  | { type: "ASSISTANT_COMPLETE"; message: Message }
  | { type: "TOOL_CALL"; message: ToolCallMessage }
  | { type: "TOOL_RESULT"; message: ToolResultMessage }
  | { type: "ERROR_MESSAGE"; message: Message }
  | { type: "ERROR_ADD"; error: UIError }
  | { type: "ERRORS_CLEAR" }
  | { type: "AGENT_STATUS"; status: AgentStatus };

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error info for UI
 */
export interface UIError {
  code: string;
  message: string;
  recoverable: boolean;
}

// ============================================================================
// Hook Types
// ============================================================================

/**
 * Return type of useAgent hook
 */
export interface UseAgentResult {
  /** All completed messages */
  messages: RenderMessage[];

  /** Current pending assistant (if any) */
  pendingAssistant: PendingAssistant | null;

  /** Streaming text */
  streaming: string;

  /** Agent status */
  status: AgentStatus;

  /** Errors */
  errors: UIError[];

  /** Send a message */
  send: (text: string) => void;

  /** Interrupt current response */
  interrupt: () => void;

  /** Whether agent is processing */
  isLoading: boolean;

  /** Clear all messages */
  clearMessages: () => void;

  /** Clear all errors */
  clearErrors: () => void;

  /** Current agent ID */
  agentId: string | null;
}

/**
 * Options for useAgent hook
 */
export interface UseAgentOptions {
  onSend?: (text: string) => void;
  onError?: (error: UIError) => void;
  onStatusChange?: (status: AgentStatus) => void;
}
