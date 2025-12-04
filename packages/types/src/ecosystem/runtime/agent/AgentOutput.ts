/**
 * AgentOutput - Union of all possible agent output events
 *
 * Includes all event layers:
 * - Stream: DriveableEvent (pass-through from Environment)
 * - State: State machine transitions
 * - Message: Assembled messages
 * - Turn: Turn analytics
 * - Error: Agent error events
 */

import type { DriveableEvent } from "~/ecosystem/event/environment/DriveableEvent";
import type { AgentStateEvent } from "~/ecosystem/event/runtime/agent/state";
import type { AgentMessageEvent } from "~/ecosystem/event/runtime/agent/message";
import type { AgentTurnEvent } from "~/ecosystem/event/runtime/agent/turn";
import type { AllAgentErrorEvent } from "~/ecosystem/event/runtime/agent/error";

/**
 * All possible output types from Agent
 */
export type AgentOutput =
  | DriveableEvent
  | AgentStateEvent
  | AgentMessageEvent
  | AgentTurnEvent
  | AllAgentErrorEvent;
