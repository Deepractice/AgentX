/**
 * Agent Message Events
 *
 * Complete message events assembled from stream events.
 * Represent full conversation messages ready for persistence and display.
 */

import type { RuntimeEvent } from "../../RuntimeEvent";
import type { ContentPart, ToolCallPart, ToolResultPart } from "~/ecosystem/runtime/agent/message/parts";

/**
 * Base MessageEvent
 */
export interface MessageEvent<T extends string = string, D = unknown> extends RuntimeEvent<T, D> {
  source: "agent";
  category: "message";
  intent: "notification";
}

// ============================================================================
// Message Events
// ============================================================================

/**
 * UserMessageEvent - User sent a message
 */
export interface UserMessageEvent extends MessageEvent<"user_message"> {
  data: {
    messageId: string;
    content: string;
    timestamp: number;
  };
}

/**
 * AssistantMessageEvent - Assistant response message
 */
export interface AssistantMessageEvent extends MessageEvent<"assistant_message"> {
  data: {
    messageId: string;
    content: ContentPart[];
    model?: string;
    stopReason?: string;
    timestamp: number;
  };
}

/**
 * ToolCallMessageEvent - Tool call message (part of assistant turn)
 */
export interface ToolCallMessageEvent extends MessageEvent<"tool_call_message"> {
  data: {
    messageId: string;
    toolCalls: ToolCallPart[];
    timestamp: number;
  };
}

/**
 * ToolResultMessageEvent - Tool result message
 */
export interface ToolResultMessageEvent extends MessageEvent<"tool_result_message"> {
  data: {
    messageId: string;
    results: ToolResultPart[];
    timestamp: number;
  };
}

// ============================================================================
// Union Type
// ============================================================================

/**
 * AgentMessageEvent - All agent message events
 */
export type AgentMessageEvent =
  | UserMessageEvent
  | AssistantMessageEvent
  | ToolCallMessageEvent
  | ToolResultMessageEvent;

/**
 * Type guard: is this a message event?
 */
export function isMessageEvent(event: RuntimeEvent): event is AgentMessageEvent {
  return event.source === "agent" && event.category === "message";
}
