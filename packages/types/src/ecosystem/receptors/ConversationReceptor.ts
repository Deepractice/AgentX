import type { Receptor } from "~/ecosystem/Receptor";
import type {
  ConversationQueuedEvent,
  ConversationStartEvent,
  ConversationThinkingEvent,
  ConversationRespondingEvent,
  ConversationEndEvent,
  ConversationInterruptedEvent,
} from "../event";

/**
 * Conversation events union type.
 */
export type ConversationEvent =
  | ConversationQueuedEvent
  | ConversationStartEvent
  | ConversationThinkingEvent
  | ConversationRespondingEvent
  | ConversationEndEvent
  | ConversationInterruptedEvent;

/**
 * ConversationReceptor - Emits conversation state RuntimeEvents.
 *
 * Responsible for emitting:
 * - conversation_queued: Message queued for processing
 * - conversation_start: Conversation turn started
 * - conversation_thinking: Agent is thinking
 * - conversation_responding: Agent is responding
 * - conversation_end: Conversation turn ended
 * - conversation_interrupted: Conversation was interrupted
 */
export interface ConversationReceptor extends Receptor {}
