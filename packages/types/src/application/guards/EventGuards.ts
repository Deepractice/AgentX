/**
 * Event Type Guards
 *
 * Runtime type guards for event classification.
 */

import type { AgentOutput } from "~/ecosystem/runtime/agent/AgentOutput";
import type { AgentStateEvent } from "~/ecosystem/event/runtime/agent/state";
import type { DriveableEvent } from "~/ecosystem/event/environment/DriveableEvent";
import type { AgentMessageEvent } from "~/ecosystem/event/runtime/agent/message";
import type { AgentTurnEvent } from "~/ecosystem/event/runtime/agent/turn";
import type { AllAgentErrorEvent } from "~/ecosystem/event/runtime/agent/error";

/**
 * State event type names (single source of truth)
 */
export const STATE_EVENT_TYPE_NAMES = [
  "agent_initializing",
  "agent_ready",
  "agent_destroyed",
  "conversation_queued",
  "conversation_start",
  "conversation_thinking",
  "conversation_responding",
  "conversation_end",
  "conversation_interrupted",
  "tool_planned",
  "tool_executing",
  "tool_completed",
  "tool_failed",
  "error_occurred",
] as const;

const STATE_EVENT_TYPES = new Set<string>(STATE_EVENT_TYPE_NAMES);

/**
 * Message event type names (single source of truth)
 */
export const MESSAGE_EVENT_TYPE_NAMES = [
  "user_message",
  "assistant_message",
  "tool_call_message",
  "tool_result_message",
] as const;

const MESSAGE_EVENT_TYPES = new Set<string>(MESSAGE_EVENT_TYPE_NAMES);

/**
 * Error event type names (single source of truth)
 * Error is independent from 4-layer hierarchy, transportable via SSE
 */
export const ERROR_EVENT_TYPE_NAMES = ["error"] as const;

const ERROR_EVENT_TYPES = new Set<string>(ERROR_EVENT_TYPE_NAMES);

/**
 * Turn event type names (single source of truth)
 */
export const TURN_EVENT_TYPE_NAMES = ["turn_request", "turn_response"] as const;

const TURN_EVENT_TYPES = new Set<string>(TURN_EVENT_TYPE_NAMES);

/**
 * Stream event type names (single source of truth)
 */
export const STREAM_EVENT_TYPE_NAMES = [
  "message_start",
  "message_delta",
  "message_stop",
  "text_content_block_start",
  "text_delta",
  "text_content_block_stop",
  "tool_use_content_block_start",
  "input_json_delta",
  "tool_use_content_block_stop",
  "tool_call",
  "tool_result",
  "interrupted",
] as const;

const STREAM_EVENT_TYPES = new Set<string>(STREAM_EVENT_TYPE_NAMES);

/**
 * Check if event is a StateEvent
 */
export function isStateEvent(event: AgentOutput): event is AgentStateEvent {
  return "type" in event && STATE_EVENT_TYPES.has(event.type);
}

/**
 * Check if event is a MessageEvent
 */
export function isMessageEvent(event: AgentOutput): event is AgentMessageEvent {
  return "type" in event && MESSAGE_EVENT_TYPES.has(event.type);
}

/**
 * Check if event is a TurnEvent
 */
export function isTurnEvent(event: AgentOutput): event is AgentTurnEvent {
  return "type" in event && TURN_EVENT_TYPES.has(event.type);
}

/**
 * Check if event is a StreamEvent (DriveableEvent)
 */
export function isStreamEvent(event: AgentOutput): event is DriveableEvent {
  return "type" in event && STREAM_EVENT_TYPES.has(event.type);
}

/**
 * Check if event is an ErrorEvent
 */
export function isErrorEvent(event: AgentOutput): event is AllAgentErrorEvent {
  return "type" in event && ERROR_EVENT_TYPES.has(event.type);
}
