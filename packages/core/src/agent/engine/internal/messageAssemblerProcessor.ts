/**
 * messageAssemblerProcessor
 *
 * Pure Mealy transition function that assembles complete Message Layer events
 * from Stream Layer events.
 *
 * Input Events (Stream Layer):
 * - message_start
 * - text_delta
 * - tool_use_start
 * - input_json_delta
 * - tool_use_stop
 * - tool_result
 * - message_stop
 *
 * Output Events (Message Layer):
 * - assistant_message (Message - includes text and tool calls in content)
 * - tool_result_message (Message - tool execution result)
 */

import type { Processor, ProcessorDefinition } from "../mealy";
import type {
  // Input: StreamEvent (from agent layer)
  StreamEvent,
  MessageStartEvent,
  TextDeltaEvent,
  ToolUseStartEvent,
  InputJsonDeltaEvent,
  ToolResultEvent,
  MessageStopEvent,
  // Output: Message events
  AssistantMessageEvent,
  ToolResultMessageEvent,
  ErrorMessageEvent,
  // Message types
  AssistantMessage,
  ToolResultMessage,
  ErrorMessage,
  // Content parts
  TextPart,
  ToolCallPart,
  ToolResultPart,
} from "../../types";

// ===== State Types =====

/**
 * Pending content accumulator
 *
 * Tracks content blocks in the order they appear in the stream.
 * Text and tool_use blocks may be interleaved.
 */
export interface PendingContent {
  type: "text" | "tool_use";
  // For text content
  textDeltas?: string[];
  // For tool use
  toolId?: string;
  toolName?: string;
  toolInputJson?: string;
  /** True when tool_use_stop has been processed and input is fully parsed */
  assembled?: boolean;
  /** Parsed tool input (set at tool_use_stop time) */
  parsedInput?: Record<string, unknown>;
}

/**
 * Pending tool call info (for matching with tool_result)
 */
export interface PendingToolCall {
  id: string;
  name: string;
}

/**
 * MessageAssemblerState
 *
 * Tracks the state of message assembly from stream events.
 */
export interface MessageAssemblerState {
  /**
   * Current message ID being assembled
   */
  currentMessageId: string | null;

  /**
   * Timestamp when the current message started
   */
  messageStartTime: number | null;

  /**
   * Pending content blocks in stream order.
   * Preserves the interleaved order of text and tool_use blocks.
   */
  pendingContents: PendingContent[];

  /**
   * Pending tool calls waiting for results
   * Key is the tool call ID
   */
  pendingToolCalls: Record<string, PendingToolCall>;
}

/**
 * Initial state factory for MessageAssembler
 */
export function createInitialMessageAssemblerState(): MessageAssemblerState {
  return {
    currentMessageId: null,
    messageStartTime: null,
    pendingContents: [],
    pendingToolCalls: {},
  };
}

// ===== Processor Implementation =====

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Find last index matching a predicate (Array.findLastIndex polyfill)
 */
function findLastIndex<T>(arr: readonly T[], predicate: (item: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i])) return i;
  }
  return -1;
}

/**
 * Output event types from MessageAssembler
 */
export type MessageAssemblerOutput =
  | AssistantMessageEvent
  | ToolResultMessageEvent
  | ErrorMessageEvent;

/**
 * Input event types for MessageAssembler
 */
export type MessageAssemblerInput = StreamEvent;

/**
 * messageAssemblerProcessor
 *
 * Pure Mealy transition function for message assembly.
 * Pattern: (state, input) => [newState, outputs]
 */
export const messageAssemblerProcessor: Processor<
  MessageAssemblerState,
  MessageAssemblerInput,
  MessageAssemblerOutput
> = (state, input): [MessageAssemblerState, MessageAssemblerOutput[]] => {
  switch (input.type) {
    case "message_start":
      return handleMessageStart(state, input);

    case "text_delta":
      return handleTextDelta(state, input);

    case "tool_use_start":
      return handleToolUseStart(state, input);

    case "input_json_delta":
      return handleInputJsonDelta(state, input);

    case "tool_use_stop":
      return handleToolUseStop(state, input);

    case "tool_result":
      return handleToolResult(state, input);

    case "message_stop":
      return handleMessageStop(state, input);

    case "error_received":
      return handleErrorReceived(state, input);

    default:
      // Pass through unhandled events (no state change, no output)
      return [state, []];
  }
};

/**
 * Handle message_start event
 */
function handleMessageStart(
  state: Readonly<MessageAssemblerState>,
  event: StreamEvent
): [MessageAssemblerState, MessageAssemblerOutput[]] {
  const { data } = event as MessageStartEvent;
  return [
    {
      ...state,
      currentMessageId: data.messageId,
      messageStartTime: event.timestamp,
      pendingContents: [],
    },
    [],
  ];
}

/**
 * Handle text_delta event
 *
 * Appends to the last text block if one exists, otherwise creates a new one.
 * This preserves the interleaved order: text after a tool_use gets its own block.
 */
function handleTextDelta(
  state: Readonly<MessageAssemblerState>,
  event: StreamEvent
): [MessageAssemblerState, MessageAssemblerOutput[]] {
  const { data } = event as TextDeltaEvent;
  const lastContent = state.pendingContents[state.pendingContents.length - 1];

  // Append to last text block if it exists
  if (lastContent?.type === "text") {
    const updated = [...state.pendingContents];
    updated[updated.length - 1] = {
      ...lastContent,
      textDeltas: [...(lastContent.textDeltas || []), data.text],
    };
    return [{ ...state, pendingContents: updated }, []];
  }

  // Create a new text block (preserves position after any preceding tool_use)
  return [
    {
      ...state,
      pendingContents: [
        ...state.pendingContents,
        { type: "text", textDeltas: [data.text] },
      ],
    },
    [],
  ];
}

/**
 * Handle tool_use_start event
 */
function handleToolUseStart(
  state: Readonly<MessageAssemblerState>,
  event: StreamEvent
): [MessageAssemblerState, MessageAssemblerOutput[]] {
  const { data } = event as ToolUseStartEvent;

  return [
    {
      ...state,
      pendingContents: [
        ...state.pendingContents,
        {
          type: "tool_use",
          toolId: data.toolCallId,
          toolName: data.toolName,
          toolInputJson: "",
        },
      ],
    },
    [],
  ];
}

/**
 * Handle input_json_delta event
 */
function handleInputJsonDelta(
  state: Readonly<MessageAssemblerState>,
  event: StreamEvent
): [MessageAssemblerState, MessageAssemblerOutput[]] {
  const { data } = event as InputJsonDeltaEvent;

  // Find the last tool_use content in the array
  const lastToolIndex = findLastIndex(state.pendingContents, (c) => c.type === "tool_use" && !c.assembled);
  if (lastToolIndex === -1) {
    return [state, []];
  }

  const existingContent = state.pendingContents[lastToolIndex];
  const updated = [...state.pendingContents];
  updated[lastToolIndex] = {
    ...existingContent,
    toolInputJson: (existingContent.toolInputJson || "") + data.partialJson,
  };

  return [{ ...state, pendingContents: updated }, []];
}

/**
 * Handle tool_use_stop event
 *
 * Marks the tool_use entry as assembled with parsed input.
 * The entry stays in pendingContents to preserve its position.
 * No event is emitted — tool calls are part of the assistant message.
 */
function handleToolUseStop(
  state: Readonly<MessageAssemblerState>,
  _event: StreamEvent
): [MessageAssemblerState, MessageAssemblerOutput[]] {
  // Find the last unassembled tool_use content
  const lastToolIndex = findLastIndex(state.pendingContents, (c) => c.type === "tool_use" && !c.assembled);
  if (lastToolIndex === -1) {
    return [state, []];
  }

  const pendingContent = state.pendingContents[lastToolIndex];
  const toolId = pendingContent.toolId || "";
  const toolName = pendingContent.toolName || "";

  // Parse tool input JSON
  let toolInput: Record<string, unknown> = {};
  try {
    toolInput = pendingContent.toolInputJson ? JSON.parse(pendingContent.toolInputJson) : {};
  } catch {
    toolInput = {};
  }

  // Mark as assembled in-place (preserves position)
  const updated = [...state.pendingContents];
  updated[lastToolIndex] = {
    ...pendingContent,
    assembled: true,
    parsedInput: toolInput,
  };

  return [
    {
      ...state,
      pendingContents: updated,
      pendingToolCalls: {
        ...state.pendingToolCalls,
        [toolId]: { id: toolId, name: toolName },
      },
    },
    [], // No event emitted
  ];
}

/**
 * Handle tool_result event
 *
 * Emits:
 * - tool_result_message (Message Event) - for UI display
 */
function handleToolResult(
  state: Readonly<MessageAssemblerState>,
  event: StreamEvent
): [MessageAssemblerState, MessageAssemblerOutput[]] {
  const { data } = event as ToolResultEvent;
  const { toolCallId, result, isError } = data;

  // Find pending tool call
  const pendingToolCall = state.pendingToolCalls[toolCallId];
  const toolName = pendingToolCall?.name || "unknown";

  // Create tool result part
  const toolResult: ToolResultPart = {
    type: "tool-result",
    id: toolCallId,
    name: toolName,
    output: {
      type: isError ? "error-text" : "text",
      value: typeof result === "string" ? result : JSON.stringify(result),
    },
  };

  // Create ToolResultMessage (complete Message object)
  const messageId = generateId();
  const timestamp = Date.now();
  const toolResultMessage: ToolResultMessage = {
    id: messageId,
    role: "tool",
    subtype: "tool-result",
    toolCallId,
    toolResult,
    timestamp,
  };

  // Emit tool_result_message event - data is complete Message object
  const toolResultMessageEvent: ToolResultMessageEvent = {
    type: "tool_result_message",
    timestamp,
    data: toolResultMessage,
  };

  // Remove from pending tool calls
  const { [toolCallId]: _, ...remainingToolCalls } = state.pendingToolCalls;

  return [
    {
      ...state,
      pendingToolCalls: remainingToolCalls,
    },
    [toolResultMessageEvent],
  ];
}

/**
 * Handle message_stop event
 *
 * Assembles the complete AssistantMessage from pendingContents in stream order.
 * Text and tool call parts are interleaved as they appeared in the stream.
 */
function handleMessageStop(
  state: Readonly<MessageAssemblerState>,
  event: StreamEvent
): [MessageAssemblerState, MessageAssemblerOutput[]] {
  const { data } = event as MessageStopEvent;

  if (!state.currentMessageId) {
    return [state, []];
  }

  // Build content parts in stream order from pendingContents
  const contentParts: Array<TextPart | ToolCallPart> = [];

  for (const pending of state.pendingContents) {
    if (pending.type === "text" && pending.textDeltas) {
      const text = pending.textDeltas.join("");
      if (text.trim().length > 0) {
        contentParts.push({ type: "text", text });
      }
    } else if (pending.type === "tool_use" && pending.assembled) {
      contentParts.push({
        type: "tool-call",
        id: pending.toolId || "",
        name: pending.toolName || "",
        input: pending.parsedInput || {},
      });
    }
  }

  const hasToolCalls = contentParts.some((p) => p.type === "tool-call");
  const hasText = contentParts.some((p) => p.type === "text");

  // Skip truly empty messages (no text AND no tool calls)
  const stopReason = data.stopReason;
  if (!hasText && !hasToolCalls) {
    const shouldPreserveToolCalls = stopReason === "tool_use";
    return [
      {
        ...createInitialMessageAssemblerState(),
        pendingToolCalls: shouldPreserveToolCalls ? state.pendingToolCalls : {},
      },
      [],
    ];
  }

  // Create AssistantMessage with interleaved content
  const timestamp = state.messageStartTime || Date.now();
  const assistantMessage: AssistantMessage = {
    id: state.currentMessageId,
    role: "assistant",
    subtype: "assistant",
    content: contentParts,
    timestamp,
  };

  // Emit AssistantMessageEvent
  const assistantEvent: AssistantMessageEvent = {
    type: "assistant_message",
    timestamp,
    data: assistantMessage,
  };

  // Reset state, but preserve pendingToolCalls if stopReason is "tool_use"
  // (tool_result events arrive after message_stop in tool call scenarios)
  const shouldPreserveToolCalls = stopReason === "tool_use";

  return [
    {
      ...createInitialMessageAssemblerState(),
      pendingToolCalls: shouldPreserveToolCalls ? state.pendingToolCalls : {},
    },
    [assistantEvent],
  ];
}

/**
 * Handle error_received event
 *
 * Emits: error_message (Message Event) - for UI display
 */
function handleErrorReceived(
  _state: Readonly<MessageAssemblerState>,
  event: StreamEvent
): [MessageAssemblerState, MessageAssemblerOutput[]] {
  const data = event.data as { message: string; errorCode?: string };

  // Create ErrorMessage (complete Message object)
  const messageId = generateId();
  const timestamp = Date.now();
  const errorMessage: ErrorMessage = {
    id: messageId,
    role: "error",
    subtype: "error",
    content: data.message,
    errorCode: data.errorCode,
    timestamp,
  };

  // Emit error_message event - data is complete Message object
  const errorMessageEvent: ErrorMessageEvent = {
    type: "error_message",
    timestamp,
    data: errorMessage,
  };

  // Reset state on error
  return [createInitialMessageAssemblerState(), [errorMessageEvent]];
}

/**
 * MessageAssembler Processor Definition
 */
export const messageAssemblerProcessorDef: ProcessorDefinition<
  MessageAssemblerState,
  MessageAssemblerInput,
  MessageAssemblerOutput
> = {
  name: "MessageAssembler",
  description: "Assembles complete messages from stream events",
  initialState: createInitialMessageAssemblerState,
  processor: messageAssemblerProcessor,
};
