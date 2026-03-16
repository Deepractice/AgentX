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
  UserContentPart,
  UserMessage,
} from "@agentxjs/core/agent";
import type { BusEvent } from "@agentxjs/core/event";
import type {
  AssistantConversation,
  Block,
  ConnectionState,
  Conversation,
  PresentationState,
  TextBlock,
  TokenUsage,
  ToolBlock,
} from "./types";
import { initialMetrics, initialPresentationState } from "./types";

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

    case "thinking_delta":
      return handleThinkingDelta(state, event.data as TextDeltaData);

    case "text_delta":
      return handleTextDelta(state, event.data as TextDeltaData);

    case "tool_use_start":
      return handleToolUseStart(state, event.data as ToolUseStartData);

    case "tool_use_stop":
      return handleToolUseStop(state, event.data as ToolUseStopData);

    case "input_json_delta":
      return handleInputJsonDelta(state, event.data as { partialJson: string });

    case "message_delta":
      return handleMessageDelta(state, event.data as MessageDeltaData);

    case "message_stop":
      return handleMessageStop(state, event.data as MessageStopData);

    // Message layer — tool results from Engine
    case "tool_result_message":
      return handleToolResultMessage(state, event.data as ToolResultMessage);

    case "tool_result":
      return handleToolResult(
        state,
        event.data as { toolCallId: string; result: unknown; isError: boolean }
      );

    case "error":
      return handleError(state, event.data as ErrorData);

    case "interrupted":
      return handleInterrupted(state);

    // Connection state
    case "connection_state":
      return handleConnectionState(state, event.data as { state: string });

    default:
      return state;
  }
}

// ============================================================================
// Helpers — operate on the last assistant conversation in conversations[]
// ============================================================================

/**
 * Get the last conversation if it's a streaming assistant conversation.
 */
function getStreamingConv(state: PresentationState): AssistantConversation | null {
  const last = state.conversations[state.conversations.length - 1];
  if (last?.role === "assistant" && (last as AssistantConversation).isStreaming) {
    return last as AssistantConversation;
  }
  return null;
}

/**
 * Update the last conversation in the array (must be streaming assistant).
 */
function updateLastConv(
  state: PresentationState,
  updater: (conv: AssistantConversation) => AssistantConversation,
  extraState?: Partial<PresentationState>
): PresentationState {
  const conv = getStreamingConv(state);
  if (!conv) return state;

  const updated = updater(conv);
  const conversations = [...state.conversations];
  conversations[conversations.length - 1] = updated;

  return { ...state, conversations, ...extraState };
}

interface InputJsonDeltaData {
  partialJson: string;
}

// ============================================================================
// Handlers — all operate on conversations[]
// ============================================================================

function handleMessageStart(state: PresentationState, _data: MessageStartData): PresentationState {
  const newConv: AssistantConversation = {
    role: "assistant",
    blocks: [],
    isStreaming: true,
  };

  // Only reset metrics at the start of a new turn (idle → thinking).
  // Mid-turn message_start (after tool_use) should keep accumulating.
  const isNewTurn = state.status === "idle";
  const metrics = isNewTurn ? { ...initialMetrics, turnStartedAt: Date.now() } : state.metrics;

  return {
    ...state,
    conversations: [...state.conversations, newConv],
    status: "thinking",
    metrics,
  };
}

function handleThinkingDelta(state: PresentationState, data: TextDeltaData): PresentationState {
  return updateLastConv(
    state,
    (conv) => {
      const blocks = [...conv.blocks];
      const lastBlock = blocks[blocks.length - 1];

      if (lastBlock && lastBlock.type === "thinking") {
        blocks[blocks.length - 1] = {
          ...lastBlock,
          content: (lastBlock as any).content + data.text,
        };
      } else {
        blocks.push({ type: "thinking", content: data.text } as Block);
      }

      return { ...conv, blocks };
    },
    { status: "thinking" }
  );
}

function handleTextDelta(state: PresentationState, data: TextDeltaData): PresentationState {
  return updateLastConv(
    state,
    (conv) => {
      const blocks = [...conv.blocks];
      const lastBlock = blocks[blocks.length - 1];

      if (lastBlock && lastBlock.type === "text") {
        blocks[blocks.length - 1] = {
          ...lastBlock,
          content: lastBlock.content + data.text,
        };
      } else {
        blocks.push({ type: "text", content: data.text } as TextBlock);
      }

      return { ...conv, blocks };
    },
    { status: "responding" }
  );
}

function handleToolUseStart(state: PresentationState, data: ToolUseStartData): PresentationState {
  const toolBlock: ToolBlock = {
    type: "tool",
    toolUseId: data.toolCallId,
    toolName: data.toolName,
    toolInput: {},
    status: "pending",
  };

  return updateLastConv(state, (conv) => ({ ...conv, blocks: [...conv.blocks, toolBlock] }), {
    status: "executing",
  });
}

function handleInputJsonDelta(
  state: PresentationState,
  data: InputJsonDeltaData
): PresentationState {
  return updateLastConv(state, (conv) => {
    const blocks = conv.blocks.map((block): Block => {
      if (block.type === "tool" && block.status === "pending") {
        return {
          ...block,
          partialInput: ((block as any).partialInput || "") + data.partialJson,
        } as ToolBlock;
      }
      return block;
    });
    return { ...conv, blocks };
  });
}

function handleToolUseStop(state: PresentationState, data: ToolUseStopData): PresentationState {
  return updateLastConv(
    state,
    (conv) => {
      const blocks = conv.blocks.map((block): Block => {
        if (block.type === "tool" && block.toolUseId === data.toolCallId) {
          return { ...block, toolInput: data.input, status: "running" };
        }
        return block;
      });
      return { ...conv, blocks };
    },
    { status: "executing" }
  );
}

function handleMessageDelta(state: PresentationState, data: MessageDeltaData): PresentationState {
  if (!data.usage) return state;

  const newState = updateLastConv(state, (conv) => {
    const prev = conv.usage;
    const usage: TokenUsage = {
      inputTokens: (prev?.inputTokens ?? 0) + data.usage!.inputTokens,
      outputTokens: (prev?.outputTokens ?? 0) + data.usage!.outputTokens,
    };
    return { ...conv, usage };
  });

  // inputTokens from LLM = current context size (full history sent each call)
  const contextTokens = data.usage.inputTokens;
  const contextLimit = newState.metrics.session.contextLimit;
  const contextUsage = contextLimit > 0 ? contextTokens / contextLimit : 0;

  return {
    ...newState,
    metrics: {
      ...newState.metrics,
      inputTokens: newState.metrics.inputTokens + data.usage.inputTokens,
      outputTokens: newState.metrics.outputTokens + data.usage.outputTokens,
      session: {
        contextTokens,
        contextLimit,
        contextUsage,
      },
    },
  };
}

function handleMessageStop(state: PresentationState, data: MessageStopData): PresentationState {
  // tool_use stop → keep streaming, tool results are still incoming
  if (data.stopReason === "tool_use") {
    return { ...state, status: "executing" };
  }

  // end_turn / max_tokens → mark completed, clear turnStartedAt
  return updateLastConv(state, (conv) => ({ ...conv, isStreaming: false }), {
    status: "idle",
    metrics: { ...state.metrics, turnStartedAt: null },
  });
}

function handleToolResultMessage(
  state: PresentationState,
  data: ToolResultMessage
): PresentationState {
  const toolCallId = data.toolCallId;

  // Find tool block in any conversation (could be in last streaming or already completed)
  const conversations = state.conversations.map((conv): Conversation => {
    if (conv.role !== "assistant") return conv;
    const ac = conv as AssistantConversation;
    const hasMatch = ac.blocks.some((b) => b.type === "tool" && b.toolUseId === toolCallId);
    if (!hasMatch) return conv;

    const blocks = ac.blocks.map((block): Block => {
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
    return { ...ac, blocks };
  });

  return { ...state, conversations, status: "responding" };
}

/**
 * Handle tool_result from stream layer (raw driver event).
 */
function handleToolResult(
  state: PresentationState,
  data: { toolCallId: string; result: unknown; isError: boolean }
): PresentationState {
  const { toolCallId, result, isError } = data;
  const resultStr =
    typeof result === "string"
      ? result
      : result instanceof Error
        ? result.message
        : JSON.stringify(result);

  const conversations = state.conversations.map((conv): Conversation => {
    if (conv.role !== "assistant") return conv;
    const ac = conv as AssistantConversation;
    const hasMatch = ac.blocks.some((b) => b.type === "tool" && b.toolUseId === toolCallId);
    if (!hasMatch) return conv;

    const blocks = ac.blocks.map((block): Block => {
      if (block.type === "tool" && block.toolUseId === toolCallId) {
        return { ...block, toolResult: resultStr, status: isError ? "error" : "completed" };
      }
      return block;
    });
    return { ...ac, blocks };
  });

  return { ...state, conversations, status: "responding" };
}

function handleError(state: PresentationState, data: ErrorData): PresentationState {
  // If there's a streaming conversation with content, keep it
  const conv = getStreamingConv(state);
  let conversations = state.conversations;
  if (conv && conv.blocks.length > 0) {
    // Mark streaming conv as completed before adding error
    conversations = [...state.conversations];
    conversations[conversations.length - 1] = { ...conv, isStreaming: false };
  }

  return {
    ...state,
    conversations: [...conversations, { role: "error", message: data.message }],
    status: "idle",
  };
}

/**
 * Interrupt handlers per block type.
 * Each handler receives a block and returns the interrupted version.
 * New block types register here — handleInterrupted stays fixed.
 */
const interruptHandlers: Partial<Record<Block["type"], (block: Block) => Block>> = {
  tool: (block) => {
    const tb = block as ToolBlock;
    if (tb.status === "pending" || tb.status === "running") {
      return { ...tb, status: "interrupted", toolResult: "Interrupted" };
    }
    return block;
  },
};

function handleInterrupted(state: PresentationState): PresentationState {
  return updateLastConv(
    state,
    (conv) => {
      const blocks = conv.blocks.map((block): Block => {
        const handler = interruptHandlers[block.type];
        return handler ? handler(block) : block;
      });
      return { ...conv, blocks, isStreaming: false };
    },
    { status: "idle" }
  );
}

function handleConnectionState(
  state: PresentationState,
  data: { state: string }
): PresentationState {
  const connection = data.state as ConnectionState;
  if (connection === state.connection) return state;
  return { ...state, connection };
}

// ============================================================================
// Helper: Add user conversation
// ============================================================================

export function addUserConversation(
  state: PresentationState,
  content: string | UserContentPart[]
): PresentationState {
  const blocks: Block[] =
    typeof content === "string"
      ? [{ type: "text", content }]
      : content.map((part) => {
          switch (part.type) {
            case "text":
              return { type: "text" as const, content: part.text };
            case "image":
              return {
                type: "image" as const,
                url: `data:${part.mediaType};base64,${part.data}`,
                alt: part.name,
              };
            case "file":
              return {
                type: "file" as const,
                filename: part.filename ?? "file",
                mediaType: part.mediaType,
              };
            default:
              return { type: "text" as const, content: String(part) };
          }
        });

  return {
    ...state,
    conversations: [...state.conversations, { role: "user", blocks }],
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
