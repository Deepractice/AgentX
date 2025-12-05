/**
 * AgentOutput - Union of all possible agent output events
 *
 * Includes all event layers:
 * - Stream: DriveableEvent (pass-through from Driver)
 * - State: State machine transitions
 * - Message: Assembled messages
 * - Turn: Turn analytics
 */

import type { DriveableEvent } from "./event/environment/DriveableEvent";
import type { AgentStateEvent } from "./event/state";
import type { AgentMessageEvent } from "./event/message";
import type { AgentTurnEvent } from "./event/turn";

/**
 * All possible output types from Agent
 */
export type AgentOutput =
  | DriveableEvent
  | AgentStateEvent
  | AgentMessageEvent
  | AgentTurnEvent;
