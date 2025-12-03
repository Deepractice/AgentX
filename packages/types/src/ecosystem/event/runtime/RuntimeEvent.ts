import type { EcosystemEvent } from "~/ecosystem/event/EcosystemEvent";

/**
 * Runtime Event - Concrete ecosystem event with runtime context.
 *
 * Extends the abstract EcosystemEvent with runtime-specific fields:
 * - agentId: Associated agent
 * - sessionId: Associated session
 * - containerId: Associated container
 *
 * All concrete events in runtime/event/ extend this interface.
 */
export interface RuntimeEvent<T extends string = string, D = unknown> extends EcosystemEvent<T, D> {
  /** Associated agent ID (optional, some events are runtime-wide) */
  readonly agentId?: string;

  /** Associated session ID (optional) */
  readonly sessionId?: string;

  /** Associated container ID (optional) */
  readonly containerId?: string;
}

/**
 * All possible Runtime Event types.
 */
export type RuntimeEventType =
  // Transport events
  | "heartbeat"
  | "connection_established"
  // Session events
  | "session_created"
  | "session_resumed"
  // Agent lifecycle events
  | "agent_started"
  | "agent_ready"
  | "agent_destroyed"
  // Conversation events
  | "conversation_queued"
  | "conversation_start"
  | "conversation_thinking"
  | "conversation_responding"
  | "conversation_end"
  | "conversation_interrupted"
  // Stream events
  | "message_start"
  | "message_stop"
  | "text_delta"
  | "tool_call"
  | "tool_result"
  | "interrupted"
  // Tool events
  | "tool_planned"
  | "tool_executing"
  | "tool_completed"
  | "tool_failed"
  // Error events
  | "error";
