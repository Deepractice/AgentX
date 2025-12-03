import type { Receptor } from "~/ecosystem/Receptor";
import type {
  MessageStartEnvEvent,
  MessageStopEnvEvent,
  TextDeltaEnvEvent,
  ToolCallEnvEvent,
  ToolResultEnvEvent,
  InterruptedEnvEvent,
} from "../event";

/**
 * Runtime stream events union type.
 */
export type RuntimeStreamEvent =
  | MessageStartEnvEvent
  | MessageStopEnvEvent
  | TextDeltaEnvEvent
  | ToolCallEnvEvent
  | ToolResultEnvEvent
  | InterruptedEnvEvent;

/**
 * StreamReceptor - Transforms stream EnvironmentEvents to RuntimeEvents.
 *
 * Listens for:
 * - text_chunk → TextDeltaEnvEvent (+ agentId, timestamp)
 * - tool_call → ToolCallEnvEvent
 * - tool_result → ToolResultEnvEvent
 * - stream_start → MessageStartEnvEvent
 * - stream_end → MessageStopEnvEvent
 * - interrupted → InterruptedEnvEvent
 */
export interface StreamReceptor extends Receptor {}
