/**
 * stateEventProcessor
 *
 * Stateless event transformer: Stream Events → State Events
 *
 * Input Events (Stream Layer):
 * - message_start
 * - message_stop
 * - text_content_block_start
 * - text_content_block_stop
 * - tool_use_content_block_start
 * - tool_use_content_block_stop
 * - tool_call
 *
 * Output Events (State Layer):
 * - conversation_start
 * - conversation_responding
 * - conversation_end
 * - tool_planned
 * - tool_executing
 */

import type { Processor, ProcessorDefinition } from "~/mealy";
import type {
  // Input: AgentStreamEvent (from Driver)
  AgentStreamEvent,
  // DriveableEvent types (for data structure)
  MessageStartEvent,
  MessageStopEvent,
  ToolUseContentBlockStartEvent,
  InterruptedEvent,
  // Output: State events
  ConversationStartEvent,
  ConversationRespondingEvent,
  ConversationEndEvent,
  ConversationInterruptedEvent,
  ToolPlannedEvent,
  ToolExecutingEvent,
} from "@agentxjs/types";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("engine/stateEventProcessor");

// ===== State Types =====

/**
 * StateEventProcessorContext
 *
 * Minimal context needed for event transformation logic.
 * Does NOT track agent state - only auxiliary info for decision-making.
 *
 * Currently empty - no context needed as all information comes from events.
 */
export interface StateEventProcessorContext {
  // Empty - all information comes from events
}

/**
 * Initial context factory for StateEventProcessor
 */
export function createInitialStateEventProcessorContext(): StateEventProcessorContext {
  return {};
}

// ===== Processor Implementation =====

/**
 * Output event types from StateEventProcessor
 */
export type StateEventProcessorOutput =
  | ConversationStartEvent
  | ConversationRespondingEvent
  | ConversationEndEvent
  | ConversationInterruptedEvent
  | ToolPlannedEvent
  | ToolExecutingEvent;

/**
 * Input event types for StateEventProcessor
 *
 * Engine receives AgentStreamEvent (DriveableEvent + context from Driver)
 */
export type StateEventProcessorInput = AgentStreamEvent;

// Removed transitionTo helper - Processor no longer tracks state

/**
 * stateEventProcessor
 *
 * Stateless event transformer: Stream Events → State Events
 *
 * Design:
 * - Does NOT track agent state (that's StateMachine's job)
 * - Only maintains auxiliary context (timestamps, etc.)
 * - Emits State Events that StateMachine consumes
 *
 * Pattern: (context, input) => [newContext, outputs]
 */
export const stateEventProcessor: Processor<
  StateEventProcessorContext,
  StateEventProcessorInput,
  StateEventProcessorOutput
> = (context, input): [StateEventProcessorContext, StateEventProcessorOutput[]] => {
  // Log all incoming Stream Events
  logger.debug(`[Stream Event] ${input.type}`, {
    context,
    eventData: "data" in input ? input.data : undefined,
  });

  switch (input.type) {
    case "message_start":
      return handleMessageStart(context, input);

    case "message_delta":
      return handleMessageDelta(context, input);

    case "message_stop":
      return handleMessageStop(context, input);

    case "text_content_block_start":
      return handleTextContentBlockStart(context, input);

    case "tool_use_content_block_start":
      return handleToolUseContentBlockStart(context, input);

    case "tool_use_content_block_stop":
      return handleToolUseContentBlockStop(context, input);

    case "tool_call":
      return handleToolCall(context, input);

    case "interrupted":
      return handleInterrupted(context, input);

    default:
      // Pass through unhandled events
      logger.debug(`[Stream Event] ${input.type} (unhandled)`);
      return [context, []];
  }
};

/**
 * Handle message_start event
 *
 * Emits: conversation_start
 */
function handleMessageStart(
  context: Readonly<StateEventProcessorContext>,
  event: AgentStreamEvent
): [StateEventProcessorContext, StateEventProcessorOutput[]] {
  const data = event.data as MessageStartEvent["data"];

  const conversationStartEvent: ConversationStartEvent = {
    type: "conversation_start",
    timestamp: Date.now(),
    source: "agent",
    category: "state",
    intent: "notification",
    context: {
      agentId: event.context.agentId,
    },
    data: {
      messageId: data.message.id,
    },
  };

  return [context, [conversationStartEvent]];
}

/**
 * Handle message_delta event
 *
 * No longer needed as stopReason is now in message_stop event.
 * Kept for compatibility with event routing.
 */
function handleMessageDelta(
  context: Readonly<StateEventProcessorContext>,
  _event: AgentStreamEvent
): [StateEventProcessorContext, StateEventProcessorOutput[]] {
  // No-op: stopReason now comes from message_stop
  return [context, []];
}

/**
 * Handle message_stop event
 *
 * Emits: conversation_end (only if stopReason is NOT "tool_use")
 *
 * This event signals that Claude has finished streaming a message.
 * However, if stopReason is "tool_use", the conversation continues
 * because Claude will execute tools and send more messages.
 */
function handleMessageStop(
  context: Readonly<StateEventProcessorContext>,
  event: AgentStreamEvent
): [StateEventProcessorContext, StateEventProcessorOutput[]] {
  const data = event.data as MessageStopEvent["data"];
  const stopReason = data.stopReason;

  logger.debug("message_stop received", { stopReason });

  // If stopReason is "tool_use", don't emit conversation_end
  // The conversation continues after tool execution
  if (stopReason === "tool_use") {
    logger.debug("Skipping conversation_end (tool_use in progress)");
    return [context, []];
  }

  // For all other cases (end_turn, max_tokens, etc.), emit conversation_end
  const conversationEndEvent: ConversationEndEvent = {
    type: "conversation_end",
    timestamp: Date.now(),
    source: "agent",
    category: "state",
    intent: "notification",
    context: {
      agentId: event.context.agentId,
    },
    data: {
      reason: "completed",
    },
  };

  return [context, [conversationEndEvent]];
}

/**
 * Handle text_content_block_start event
 *
 * Emits: conversation_responding
 */
function handleTextContentBlockStart(
  context: Readonly<StateEventProcessorContext>,
  event: AgentStreamEvent
): [StateEventProcessorContext, StateEventProcessorOutput[]] {
  const respondingEvent: ConversationRespondingEvent = {
    type: "conversation_responding",
    timestamp: Date.now(),
    source: "agent",
    category: "state",
    intent: "notification",
    context: {
      agentId: event.context.agentId,
    },
    data: {},
  };

  return [context, [respondingEvent]];
}

/**
 * Handle tool_use_content_block_start event
 *
 * Emits: tool_planned, tool_executing
 */
function handleToolUseContentBlockStart(
  context: Readonly<StateEventProcessorContext>,
  event: AgentStreamEvent
): [StateEventProcessorContext, StateEventProcessorOutput[]] {
  const data = event.data as ToolUseContentBlockStartEvent["data"];
  const outputs: StateEventProcessorOutput[] = [];

  // Emit ToolPlannedEvent
  const toolPlannedEvent: ToolPlannedEvent = {
    type: "tool_planned",
    timestamp: Date.now(),
    source: "agent",
    category: "state",
    intent: "notification",
    context: {
      agentId: event.context.agentId,
    },
    data: {
      toolId: data.id,
      toolName: data.name,
    },
  };
  outputs.push(toolPlannedEvent);

  // Emit ToolExecutingEvent
  const toolExecutingEvent: ToolExecutingEvent = {
    type: "tool_executing",
    timestamp: Date.now(),
    source: "agent",
    category: "state",
    intent: "notification",
    context: {
      agentId: event.context.agentId,
    },
    data: {
      toolId: data.id,
      toolName: data.name,
      input: {},
    },
  };
  outputs.push(toolExecutingEvent);

  return [context, outputs];
}

/**
 * Handle tool_use_content_block_stop event
 *
 * Pass through - no State Event emitted.
 * StateMachine handles the state transition internally.
 */
function handleToolUseContentBlockStop(
  context: Readonly<StateEventProcessorContext>,
  _event: AgentStreamEvent
): [StateEventProcessorContext, StateEventProcessorOutput[]] {
  // Pass through - no State Event
  return [context, []];
}

/**
 * Handle tool_call event
 *
 * Pass through - no State Event emitted.
 * StateMachine handles the state transition internally.
 */
function handleToolCall(
  context: Readonly<StateEventProcessorContext>,
  _event: AgentStreamEvent
): [StateEventProcessorContext, StateEventProcessorOutput[]] {
  // Pass through - no State Event
  return [context, []];
}

/**
 * Handle interrupted event
 *
 * Emits: conversation_interrupted
 *
 * This event signals that the operation was interrupted by user or system.
 * The conversation will transition back to idle state.
 */
function handleInterrupted(
  context: Readonly<StateEventProcessorContext>,
  event: AgentStreamEvent
): [StateEventProcessorContext, StateEventProcessorOutput[]] {
  const data = event.data as InterruptedEvent["data"];
  logger.debug("interrupted event received", { reason: data.reason });

  const conversationInterruptedEvent: ConversationInterruptedEvent = {
    type: "conversation_interrupted",
    timestamp: Date.now(),
    source: "agent",
    category: "state",
    intent: "notification",
    context: {
      agentId: event.context.agentId,
    },
    data: {
      reason: data.reason,
    },
  };

  return [context, [conversationInterruptedEvent]];
}

/**
 * StateEvent Processor Definition
 *
 * Stateless event transformer: Stream Events → State Events
 */
export const stateEventProcessorDef: ProcessorDefinition<
  StateEventProcessorContext,
  StateEventProcessorInput,
  StateEventProcessorOutput
> = {
  name: "StateEventProcessor",
  description: "Transform Stream Events into State Events",
  initialState: createInitialStateEventProcessorContext,
  processor: stateEventProcessor,
};
