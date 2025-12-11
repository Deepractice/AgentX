/**
 * Message Reducer
 *
 * Unified state management for messages with single entry point.
 * All message events flow through this reducer.
 */

import type {
  Message,
  ToolCallMessage,
  ToolResultMessage,
  AssistantMessage,
  ErrorMessage,
} from "agentxjs";
import type {
  MessageState,
  MessageAction,
  RenderMessage,
  RenderUserMessage,
  RenderAssistantMessage,
  RenderToolCallMessage,
  RenderErrorMessage,
} from "./types";

/**
 * Initial state
 */
export const initialMessageState: MessageState = {
  messages: [],
  pendingAssistant: null,
  streaming: "",
  messageIds: new Set(),
  pendingToolCalls: new Map(),
  errors: [],
  agentStatus: "idle",
};

/**
 * Convert Message to RenderMessage
 */
function toRenderMessage(msg: Message): RenderMessage | null {
  switch (msg.subtype) {
    case "user":
      return {
        id: msg.id,
        role: "user",
        subtype: "user",
        content: msg.content,
        timestamp: msg.timestamp,
        status: "success", // History messages are always success
      } as RenderUserMessage;

    case "assistant": {
      const assistantMsg = msg as AssistantMessage;
      const contentStr =
        typeof assistantMsg.content === "string"
          ? assistantMsg.content
          : assistantMsg.content
              .filter((part) => part.type === "text")
              .map((part) => (part as { type: "text"; text: string }).text)
              .join("");
      return {
        id: msg.id,
        role: "assistant",
        subtype: "assistant",
        content: contentStr,
        timestamp: msg.timestamp,
        status: "completed", // History messages are completed
      } as RenderAssistantMessage;
    }

    case "tool-call": {
      const toolCallMsg = msg as ToolCallMessage;
      return {
        id: msg.id,
        role: "assistant",
        subtype: "tool-call",
        timestamp: msg.timestamp,
        toolCall: {
          id: toolCallMsg.toolCall.id,
          name: toolCallMsg.toolCall.name,
          input: toolCallMsg.toolCall.input,
        },
        // toolResult will be filled by tool-result message
      } as RenderToolCallMessage;
    }

    case "tool-result":
      // Tool results are embedded in tool-call, not standalone
      return null;

    case "error":
      return {
        id: msg.id,
        role: "system",
        subtype: "error",
        content: (msg as ErrorMessage).content,
        timestamp: msg.timestamp,
      } as RenderErrorMessage;

    default:
      return null;
  }
}

/**
 * Process history messages - convert and pair tools
 */
function processHistoryMessages(messages: Message[]): {
  renderMessages: RenderMessage[];
  messageIds: Set<string>;
  pendingToolCalls: Map<string, number>;
} {
  const renderMessages: RenderMessage[] = [];
  const messageIds = new Set<string>();
  const pendingToolCalls = new Map<string, number>();

  // First pass: collect tool results
  const toolResultMap = new Map<string, ToolResultMessage>();
  for (const msg of messages) {
    if (msg.subtype === "tool-result") {
      const toolResult = msg as ToolResultMessage;
      toolResultMap.set(toolResult.toolCallId, toolResult);
      messageIds.add(msg.id);
    }
  }

  // Second pass: convert messages and pair tools
  for (const msg of messages) {
    if (msg.subtype === "tool-result") {
      // Already processed
      continue;
    }

    const renderMsg = toRenderMessage(msg);
    if (!renderMsg) continue;

    messageIds.add(msg.id);

    // Pair tool-call with tool-result
    if (renderMsg.subtype === "tool-call") {
      const toolCallMsg = renderMsg as RenderToolCallMessage;
      const toolResult = toolResultMap.get(toolCallMsg.toolCall.id);

      if (toolResult) {
        toolCallMsg.toolResult = {
          output: toolResult.toolResult.output,
          duration: (toolResult.timestamp - msg.timestamp) / 1000,
        };
      } else {
        // Tool call without result - mark as pending
        pendingToolCalls.set(toolCallMsg.toolCall.id, renderMessages.length);
      }
    }

    renderMessages.push(renderMsg);
  }

  return { renderMessages, messageIds, pendingToolCalls };
}

/**
 * Message reducer
 */
export function messageReducer(state: MessageState, action: MessageAction): MessageState {
  switch (action.type) {
    case "RESET":
      return initialMessageState;

    case "LOAD_HISTORY": {
      const { renderMessages, messageIds, pendingToolCalls } = processHistoryMessages(
        action.messages
      );
      return {
        ...state,
        messages: renderMessages,
        messageIds,
        pendingToolCalls,
        pendingAssistant: null,
        streaming: "",
      };
    }

    case "USER_MESSAGE_ADD": {
      // Dedupe check
      if (state.messageIds.has(action.message.id)) {
        return state;
      }

      const newMessageIds = new Set(state.messageIds);
      newMessageIds.add(action.message.id);

      return {
        ...state,
        messages: [...state.messages, action.message],
        messageIds: newMessageIds,
      };
    }

    case "USER_MESSAGE_STATUS": {
      // Update last user message status
      const messages = [...state.messages];
      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (msg.subtype === "user" && (msg as RenderUserMessage).status === "pending") {
          messages[i] = {
            ...msg,
            status: action.status,
            errorCode: action.errorCode,
          } as RenderUserMessage;
          break;
        }
      }
      return { ...state, messages };
    }

    case "PENDING_ASSISTANT_ADD": {
      return {
        ...state,
        pendingAssistant: {
          id: action.id,
          status: "queued",
        },
        streaming: "",
      };
    }

    case "PENDING_ASSISTANT_STATUS": {
      if (!state.pendingAssistant) return state;
      return {
        ...state,
        pendingAssistant: {
          ...state.pendingAssistant,
          status: action.status,
        },
      };
    }

    case "TEXT_DELTA": {
      return {
        ...state,
        streaming: state.streaming + action.text,
      };
    }

    case "ASSISTANT_COMPLETE": {
      const msg = action.message as AssistantMessage;

      // Dedupe check
      if (state.messageIds.has(msg.id)) {
        // Already exists - just clear pending state
        return {
          ...state,
          pendingAssistant: null,
          streaming: "",
        };
      }

      // Extract content as string
      const contentStr =
        typeof msg.content === "string"
          ? msg.content
          : msg.content
              .filter((part) => part.type === "text")
              .map((part) => (part as { type: "text"; text: string }).text)
              .join("");

      const renderMsg: RenderAssistantMessage = {
        id: msg.id,
        role: "assistant",
        subtype: "assistant",
        content: contentStr,
        timestamp: msg.timestamp,
        status: "completed",
      };

      const newMessageIds = new Set(state.messageIds);
      newMessageIds.add(msg.id);

      return {
        ...state,
        messages: [...state.messages, renderMsg],
        messageIds: newMessageIds,
        pendingAssistant: null,
        streaming: "",
      };
    }

    case "TOOL_CALL": {
      const msg = action.message;

      // Dedupe check
      if (state.messageIds.has(msg.id)) {
        return state;
      }

      const renderMsg: RenderToolCallMessage = {
        id: msg.id,
        role: "assistant",
        subtype: "tool-call",
        timestamp: msg.timestamp,
        toolCall: {
          id: msg.toolCall.id,
          name: msg.toolCall.name,
          input: msg.toolCall.input,
        },
      };

      const newMessageIds = new Set(state.messageIds);
      newMessageIds.add(msg.id);

      // Track for pairing with result
      const newPendingToolCalls = new Map(state.pendingToolCalls);
      newPendingToolCalls.set(msg.toolCall.id, state.messages.length);

      return {
        ...state,
        messages: [...state.messages, renderMsg],
        messageIds: newMessageIds,
        pendingToolCalls: newPendingToolCalls,
      };
    }

    case "TOOL_RESULT": {
      const msg = action.message;

      // Dedupe check
      if (state.messageIds.has(msg.id)) {
        return state;
      }

      // Find corresponding tool-call
      const toolCallIndex = state.pendingToolCalls.get(msg.toolCallId);
      if (toolCallIndex === undefined) {
        // No matching tool-call found, ignore
        return state;
      }

      // Update tool-call with result
      const messages = [...state.messages];
      const toolCallMsg = messages[toolCallIndex] as RenderToolCallMessage;

      messages[toolCallIndex] = {
        ...toolCallMsg,
        toolResult: {
          output: msg.toolResult.output,
          duration: (msg.timestamp - toolCallMsg.timestamp) / 1000,
        },
      };

      const newMessageIds = new Set(state.messageIds);
      newMessageIds.add(msg.id);

      // Remove from pending
      const newPendingToolCalls = new Map(state.pendingToolCalls);
      newPendingToolCalls.delete(msg.toolCallId);

      return {
        ...state,
        messages,
        messageIds: newMessageIds,
        pendingToolCalls: newPendingToolCalls,
      };
    }

    case "ERROR_MESSAGE": {
      const msg = action.message as ErrorMessage;

      // Dedupe check
      if (state.messageIds.has(msg.id)) {
        return state;
      }

      const renderMsg: RenderErrorMessage = {
        id: msg.id,
        role: "system",
        subtype: "error",
        content: msg.content,
        timestamp: msg.timestamp,
      };

      const newMessageIds = new Set(state.messageIds);
      newMessageIds.add(msg.id);

      return {
        ...state,
        messages: [...state.messages, renderMsg],
        messageIds: newMessageIds,
        pendingAssistant: null,
        streaming: "",
      };
    }

    case "ERROR_ADD": {
      return {
        ...state,
        errors: [...state.errors, action.error],
      };
    }

    case "ERRORS_CLEAR": {
      return {
        ...state,
        errors: [],
      };
    }

    case "AGENT_STATUS": {
      return {
        ...state,
        agentStatus: action.status,
      };
    }

    default:
      return state;
  }
}
