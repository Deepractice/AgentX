/**
 * Presentation Reducer
 *
 * Aggregates stream events into PresentationState.
 * Pure function: (state, event) => newState
 */

import type { BusEvent } from "@agentxjs/core/event";
import type {
  PresentationState,
  AssistantConversation,
  TextBlock,
  ToolBlock,
  Block,
} from "./types";
import { initialPresentationState } from "./types";

// ============================================================================
// Event Data Types (from stream events)
// ============================================================================

interface MessageStartData {
  messageId?: string;
  model?: string;
}

interface TextDeltaData {
  text: string;
}

interface ToolUseStartData {
  toolUseId: string;
  toolName: string;
}

interface InputJsonDeltaData {
  delta: string;
}

interface ToolResultData {
  toolUseId: string;
  result: string;
  isError?: boolean;
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
 * Reduce a stream event into presentation state
 */
export function presentationReducer(
  state: PresentationState,
  event: BusEvent
): PresentationState {
  switch (event.type) {
    case "message_start":
      return handleMessageStart(state, event.data as MessageStartData);

    case "text_delta":
      return handleTextDelta(state, event.data as TextDeltaData);

    case "tool_use_start":
      return handleToolUseStart(state, event.data as ToolUseStartData);

    case "input_json_delta":
      return handleInputJsonDelta(state, event.data as InputJsonDeltaData);

    case "tool_result":
      return handleToolResult(state, event.data as ToolResultData);

    case "message_stop":
      return handleMessageStop(state, event.data as MessageStopData);

    case "error":
      return handleError(state, event.data as ErrorData);

    default:
      return state;
  }
}

// ============================================================================
// Handlers
// ============================================================================

function handleMessageStart(
  state: PresentationState,
  _data: MessageStartData
): PresentationState {
  // Start a new streaming assistant conversation
  const streaming: AssistantConversation = {
    role: "assistant",
    blocks: [],
    isStreaming: true,
  };

  return {
    ...state,
    streaming,
    status: "thinking",
  };
}

function handleTextDelta(
  state: PresentationState,
  data: TextDeltaData
): PresentationState {
  if (!state.streaming) {
    return state;
  }

  const blocks = [...state.streaming.blocks];
  const lastBlock = blocks[blocks.length - 1];

  // Append to existing TextBlock or create new one
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

function handleToolUseStart(
  state: PresentationState,
  data: ToolUseStartData
): PresentationState {
  if (!state.streaming) {
    return state;
  }

  const toolBlock: ToolBlock = {
    type: "tool",
    toolUseId: data.toolUseId,
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

function handleInputJsonDelta(
  state: PresentationState,
  data: InputJsonDeltaData
): PresentationState {
  if (!state.streaming) {
    return state;
  }

  const blocks = [...state.streaming.blocks];
  const lastBlock = blocks[blocks.length - 1];

  // Find the last tool block and update its input
  if (lastBlock && lastBlock.type === "tool") {
    // Accumulate JSON delta (will be parsed when complete)
    const currentInput = (lastBlock as ToolBlock & { _rawInput?: string })._rawInput || "";
    const newInput = currentInput + data.delta;

    // Try to parse the accumulated JSON
    let toolInput = lastBlock.toolInput;
    try {
      toolInput = JSON.parse(newInput);
    } catch {
      // Not yet valid JSON, keep accumulating
    }

    blocks[blocks.length - 1] = {
      ...lastBlock,
      toolInput,
      _rawInput: newInput,
      status: "running",
    } as ToolBlock & { _rawInput?: string };

    return {
      ...state,
      streaming: {
        ...state.streaming,
        blocks,
      },
    };
  }

  return state;
}

function handleToolResult(
  state: PresentationState,
  data: ToolResultData
): PresentationState {
  if (!state.streaming) {
    return state;
  }

  const blocks = state.streaming.blocks.map((block): Block => {
    if (block.type === "tool" && block.toolUseId === data.toolUseId) {
      return {
        ...block,
        toolResult: data.result,
        status: data.isError ? "error" : "completed",
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

function handleMessageStop(
  state: PresentationState,
  _data: MessageStopData
): PresentationState {
  if (!state.streaming) {
    return state;
  }

  // Move streaming to conversations
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

function handleError(
  state: PresentationState,
  data: ErrorData
): PresentationState {
  // Add error conversation
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

/**
 * Add a user conversation to state
 */
export function addUserConversation(
  state: PresentationState,
  content: string
): PresentationState {
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

/**
 * Create initial state
 */
export function createInitialState(): PresentationState {
  return { ...initialPresentationState };
}
