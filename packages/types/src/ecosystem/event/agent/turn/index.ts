/**
 * Turn Layer
 *
 * Conversation turn events tracking complete user-AI interactions.
 * A turn is a complete conversation cycle including tool calls.
 *
 * ## ADR: Turn Layer Purpose
 *
 * Turn Layer provides a higher-level view of conversations:
 * - Groups related messages into user request + AI complete response
 * - Tracks turn-level metrics (duration, cost, tokens for entire agentic flow)
 * - Provides clear boundaries for each conversation turn
 *
 * ## Event Flow
 *
 * ```
 * 1. TurnRequestEvent - User sends request
 * 2. [Processing happens - Stream/State/Message events, tool calls]
 * 3. TurnResponseEvent - AI completes final response (after all tool calls)
 * ```
 *
 * ## ADR: Why Separate from Message Layer
 *
 * Message Layer tracks individual messages, Turn Layer tracks complete interactions.
 * A single turn may include multiple messages (tool calls, retries, etc.).
 */

export type { TurnEvent, TurnEventType } from "./TurnEvent";
export type { TurnRequestEvent } from "./TurnRequestEvent";
export type { TurnResponseEvent } from "./TurnResponseEvent";
