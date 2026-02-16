/**
 * Presentation Reducer
 *
 * Aggregates events into PresentationState.
 * Pure function: (state, event) => newState
 *
 * Event consumption strategy:
 * - Stream layer: message_start, text_delta, tool_use_start, tool_use_stop, message_stop
 *   (for real-time streaming display)
 * - Message layer: tool_result_message
 *   (for tool execution results — arrives after message_stop)
 *
 * Tool calls are stream-level blocks within the assistant turn,
 * matching the mainstream API pattern (Anthropic, OpenAI).
 */

import type {
  AssistantMessage,
  ErrorMessage,
  Message,
  ToolCallPart,
  ToolResultMessage,
  ToolResultOutput,
  UserMessage,
} from "@agentxjs/core/agent";
import type { BusEvent } from "@agentxjs/core/event";
import type {
  AssistantConversation,
  Block,
  Conversation,
  PresentationState,
  TextBlock,
  TokenUsage,
  ToolBlock,
} from "./types";
import { initialPresentationState } from "./types";

// ============================================================================
// Event Data Types
// ============================================================================

interface MessageStartData {
  messageId?: string;
  model?: string;
}

interface TextDeltaData {
  text: string;
}

interface ToolUseStartData {
  toolCallId: string;
  toolName: string;
}

interface ToolUseStopData {
  toolCallId: string;
  toolName: string;
  input: Record<string, unknown>;
}

interface MessageDeltaData {
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

interface MessageStopData {
  stopReason?: string;
}

interface ErrorData {
  message: string;
  code?: string;
}

// ============================================================================
// Reducer
// ============================================================================

/**
 * Reduce an event into presentation state.
 *
 * Consumes:
 * - Stream events: message_start, text_delta, tool_use_start, tool_use_stop, message_stop
 * - Message events: tool_result_message
 * - Error events: error
 */
export function presentationReducer(state: PresentationState, event: BusEvent): PresentationState {
  switch (event.type) {
    // Stream layer — real-time display
    case "message_start":
      return handleMessageStart(state, event.data as MessageStartData);

    case "text_delta":
      return handleTextDelta(state, event.data as TextDeltaData);

    case "tool_use_start":
      return handleToolUseStart(state, event.data as ToolUseStartData);

    case "tool_use_stop":
      return handleToolUseStop(state, event.data as ToolUseStopData);

    case "message_delta":
      return handleMessageDelta(state, event.data as MessageDeltaData);

    case "message_stop":
      return handleMessageStop(state, event.data as MessageStopData);

    // Message layer — tool results from Engine
    case "tool_result_message":
      return handleToolResultMessage(state, event.data as ToolResultMessage);

    case "error":
      return handleError(state, event.data as ErrorData);

    default:
      return state;
  }
}

// ============================================================================
// Handlers
// ============================================================================

function handleMessageStart(state: PresentationState, _data: MessageStartData): PresentationState {
  // If streaming already exists (e.g. tool_use turn not yet flushed), flush it first
  let conversations = state.conversations;
  if (state.streaming && state.streaming.blocks.length > 0) {
    conversations = [...conversations, { ...state.streaming, isStreaming: false }];
  }

  const streaming: AssistantConversation = {
    role: "assistant",
    blocks: [],
    isStreaming: true,
  };

  return {
    ...state,
    conversations,
    streaming,
    status: "thinking",
  };
}

function handleTextDelta(state: PresentationState, data: TextDeltaData): PresentationState {
  if (!state.streaming) {
    return state;
  }

  const blocks = [...state.streaming.blocks];
  const lastBlock = blocks[blocks.length - 1];

  if (lastBlock && lastBlock.type === "text") {
    blocks[blocks.length - 1] = {
      ...lastBlock,
      content: lastBlock.content + data.text,
    };
  } else {
    blocks.push({
      type: "text",
      content: data.text,
    } as TextBlock);
  }

  return {
    ...state,
    streaming: {
      ...state.streaming,
      blocks,
    },
    status: "responding",
  };
}

function handleToolUseStart(state: PresentationState, data: ToolUseStartData): PresentationState {
  if (!state.streaming) {
    return state;
  }

  // Create a pending tool block — toolInput will be filled by tool_use_stop
  const toolBlock: ToolBlock = {
    type: "tool",
    toolUseId: data.toolCallId,
    toolName: data.toolName,
    toolInput: {},
    status: "pending",
  };

  return {
    ...state,
    streaming: {
      ...state.streaming,
      blocks: [...state.streaming.blocks, toolBlock],
    },
    status: "executing",
  };
}

/**
 * Handle tool_use_stop from stream layer.
 * Fills in the complete toolInput for the matching pending tool block.
 * The stream event carries the fully assembled input.
 */
function handleToolUseStop(state: PresentationState, data: ToolUseStopData): PresentationState {
  if (!state.streaming) {
    return state;
  }

  const blocks = state.streaming.blocks.map((block): Block => {
    if (block.type === "tool" && block.toolUseId === data.toolCallId) {
      return {
        ...block,
        toolInput: data.input,
        status: "running",
      };
    }
    return block;
  });

  return {
    ...state,
    streaming: {
      ...state.streaming,
      blocks,
    },
  };
}

function handleMessageDelta(state: PresentationState, data: MessageDeltaData): PresentationState {
  if (!state.streaming || !data.usage) {
    return state;
  }

  const prev = state.streaming.usage;
  const usage: TokenUsage = {
    inputTokens: (prev?.inputTokens ?? 0) + data.usage.inputTokens,
    outputTokens: (prev?.outputTokens ?? 0) + data.usage.outputTokens,
  };

  return {
    ...state,
    streaming: {
      ...state.streaming,
      usage,
    },
  };
}

function handleMessageStop(state: PresentationState, data: MessageStopData): PresentationState {
  if (!state.streaming) {
    return state;
  }

  // tool_use stop → don't flush, tool results are still incoming
  if (data.stopReason === "tool_use") {
    return {
      ...state,
      status: "executing",
    };
  }

  // end_turn / max_tokens / etc → flush streaming to conversations
  const completedConversation: AssistantConversation = {
    ...state.streaming,
    isStreaming: false,
  };

  return {
    ...state,
    conversations: [...state.conversations, completedConversation],
    streaming: null,
    status: "idle",
  };
}

/**
 * Handle tool_result_message from Engine layer.
 * Fills in the toolResult for the matching tool block.
 *
 * Note: tool_result_message arrives after message_stop(tool_use),
 * but streaming is kept alive (not flushed) during tool_use turns.
 */
function handleToolResultMessage(
  state: PresentationState,
  data: ToolResultMessage
): PresentationState {
  if (!state.streaming) {
    return state;
  }

  const toolCallId = data.toolCallId;
  const blocks = state.streaming.blocks.map((block): Block => {
    if (block.type === "tool" && block.toolUseId === toolCallId) {
      return {
        ...block,
        toolResult: formatToolResultOutput(data.toolResult.output),
        status:
          data.toolResult.output.type === "error-text" ||
          data.toolResult.output.type === "error-json" ||
          data.toolResult.output.type === "execution-denied"
            ? "error"
            : "completed",
      };
    }
    return block;
  });

  return {
    ...state,
    streaming: {
      ...state.streaming,
      blocks,
    },
    status: "responding",
  };
}

function handleError(state: PresentationState, data: ErrorData): PresentationState {
  return {
    ...state,
    conversations: [
      ...state.conversations,
      {
        role: "error",
        message: data.message,
      },
    ],
    streaming: null,
    status: "idle",
  };
}

// ============================================================================
// Helper: Add user conversation
// ============================================================================

export function addUserConversation(state: PresentationState, content: string): PresentationState {
  return {
    ...state,
    conversations: [
      ...state.conversations,
      {
        role: "user",
        blocks: [{ type: "text", content }],
      },
    ],
  };
}

export function createInitialState(): PresentationState {
  return { ...initialPresentationState };
}

// ============================================================================
// Helper: Format tool result output
// ============================================================================

function formatToolResultOutput(output: ToolResultOutput): string {
  switch (output.type) {
    case "text":
    case "error-text":
      return output.value;
    case "json":
    case "error-json":
      return JSON.stringify(output.value);
    case "execution-denied":
      return output.reason ?? "Execution denied";
    case "content":
      return output.value
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("");
  }
}

// ============================================================================
// Message → Conversation Converter
// ============================================================================

/**
 * Convert persisted Messages to Presentation Conversations.
 *
 * Groups consecutive assistant + tool-result messages
 * into a single AssistantConversation.
 *
 * Tool calls are now part of AssistantMessage.content (as ToolCallPart),
 * so we extract them directly from the assistant message.
 */
export function messagesToConversations(messages: Message[]): Conversation[] {
  const conversations: Conversation[] = [];
  let currentAssistant: AssistantConversation | null = null;

  function flushAssistant() {
    if (currentAssistant && currentAssistant.blocks.length > 0) {
      conversations.push(currentAssistant);
    }
    currentAssistant = null;
  }

  for (const msg of messages) {
    switch (msg.subtype) {
      case "user": {
        flushAssistant();
        const m = msg as UserMessage;
        const text =
          typeof m.content === "string"
            ? m.content
            : m.content
                .filter((p): p is { type: "text"; text: string } => p.type === "text")
                .map((p) => p.text)
                .join("");
        conversations.push({
          role: "user",
          blocks: [{ type: "text", content: text }],
        });
        break;
      }

      case "assistant": {
        if (!currentAssistant) {
          currentAssistant = { role: "assistant", blocks: [], isStreaming: false };
        }
        const m = msg as AssistantMessage;
        if (typeof m.content === "string") {
          if (m.content) {
            currentAssistant.blocks.push({ type: "text", content: m.content } as TextBlock);
          }
        } else {
          // Extract text and tool call parts from content
          for (const part of m.content) {
            if (part.type === "text") {
              if (part.text) {
                currentAssistant.blocks.push({ type: "text", content: part.text } as TextBlock);
              }
            } else if (part.type === "tool-call") {
              const tc = part as ToolCallPart;
              currentAssistant.blocks.push({
                type: "tool",
                toolUseId: tc.id,
                toolName: tc.name,
                toolInput: tc.input,
                status: "completed",
              } as ToolBlock);
            }
          }
        }
        break;
      }

      case "tool-result": {
        const m = msg as ToolResultMessage;
        if (currentAssistant) {
          for (const block of currentAssistant.blocks) {
            if (block.type === "tool" && block.toolUseId === m.toolResult.id) {
              block.toolResult = formatToolResultOutput(m.toolResult.output);
              block.status =
                m.toolResult.output.type === "error-text" ||
                m.toolResult.output.type === "error-json" ||
                m.toolResult.output.type === "execution-denied"
                  ? "error"
                  : "completed";
              break;
            }
          }
        }
        break;
      }

      case "error": {
        flushAssistant();
        const m = msg as ErrorMessage;
        conversations.push({
          role: "error",
          message: m.content,
        });
        break;
      }
    }
  }

  flushAssistant();
  return conversations;
}
