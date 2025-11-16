/**
 * Reactor Interfaces
 *
 * Type-safe contracts for handling events from each layer.
 * All Reactor interfaces are defined here in agentx-core.
 */

import type {
  // Stream events
  MessageStartEvent,
  MessageDeltaEvent,
  MessageStopEvent,
  TextContentBlockStartEvent,
  TextDeltaEvent,
  TextContentBlockStopEvent,
  ToolUseContentBlockStartEvent,
  InputJsonDeltaEvent,
  ToolUseContentBlockStopEvent,
  // State events
  AgentInitializingStateEvent,
  AgentReadyStateEvent,
  AgentDestroyedStateEvent,
  ConversationStartStateEvent,
  ConversationThinkingStateEvent,
  ConversationRespondingStateEvent,
  ConversationEndStateEvent,
  ToolPlannedStateEvent,
  ToolExecutingStateEvent,
  ToolCompletedStateEvent,
  ToolFailedStateEvent,
  StreamStartStateEvent,
  StreamCompleteStateEvent,
  ErrorOccurredStateEvent,
  // Message events
  UserMessageEvent,
  AssistantMessageEvent,
  ToolUseMessageEvent,
  ErrorMessageEvent,
  // Exchange events
  ExchangeRequestEvent,
  ExchangeResponseEvent,
} from "@deepractice-ai/agentx-event";

// ===== Stream Layer =====

/**
 * StreamReactor - Complete contract for Stream events
 *
 * Forces implementation of ALL stream event handlers.
 */
export interface StreamReactor {
  onMessageStart(event: MessageStartEvent): void | Promise<void>;
  onMessageDelta(event: MessageDeltaEvent): void | Promise<void>;
  onMessageStop(event: MessageStopEvent): void | Promise<void>;
  onTextContentBlockStart(event: TextContentBlockStartEvent): void | Promise<void>;
  onTextDelta(event: TextDeltaEvent): void | Promise<void>;
  onTextContentBlockStop(event: TextContentBlockStopEvent): void | Promise<void>;
  onToolUseContentBlockStart(event: ToolUseContentBlockStartEvent): void | Promise<void>;
  onInputJsonDelta(event: InputJsonDeltaEvent): void | Promise<void>;
  onToolUseContentBlockStop(event: ToolUseContentBlockStopEvent): void | Promise<void>;
}

/**
 * PartialStreamReactor - Partial implementation
 */
export type PartialStreamReactor = Partial<StreamReactor>;

// ===== State Layer =====

/**
 * StateReactor - Complete contract for State events
 *
 * Forces implementation of ALL state event handlers.
 */
export interface StateReactor {
  onAgentInitializing(event: AgentInitializingStateEvent): void | Promise<void>;
  onAgentReady(event: AgentReadyStateEvent): void | Promise<void>;
  onAgentDestroyed(event: AgentDestroyedStateEvent): void | Promise<void>;
  onConversationStart(event: ConversationStartStateEvent): void | Promise<void>;
  onConversationThinking(event: ConversationThinkingStateEvent): void | Promise<void>;
  onConversationResponding(event: ConversationRespondingStateEvent): void | Promise<void>;
  onConversationEnd(event: ConversationEndStateEvent): void | Promise<void>;
  onToolPlanned(event: ToolPlannedStateEvent): void | Promise<void>;
  onToolExecuting(event: ToolExecutingStateEvent): void | Promise<void>;
  onToolCompleted(event: ToolCompletedStateEvent): void | Promise<void>;
  onToolFailed(event: ToolFailedStateEvent): void | Promise<void>;
  onStreamStart(event: StreamStartStateEvent): void | Promise<void>;
  onStreamComplete(event: StreamCompleteStateEvent): void | Promise<void>;
  onErrorOccurred(event: ErrorOccurredStateEvent): void | Promise<void>;
}

/**
 * PartialStateReactor - Partial implementation
 */
export type PartialStateReactor = Partial<StateReactor>;

// ===== Message Layer =====

/**
 * MessageReactor - Complete contract for Message events
 *
 * Forces implementation of ALL message event handlers.
 */
export interface MessageReactor {
  onUserMessage(event: UserMessageEvent): void | Promise<void>;
  onAssistantMessage(event: AssistantMessageEvent): void | Promise<void>;
  onToolUseMessage(event: ToolUseMessageEvent): void | Promise<void>;
  onErrorMessage(event: ErrorMessageEvent): void | Promise<void>;
}

/**
 * PartialMessageReactor - Partial implementation
 */
export type PartialMessageReactor = Partial<MessageReactor>;

// ===== Exchange Layer =====

/**
 * ExchangeReactor - Complete contract for Exchange events
 *
 * Forces implementation of ALL exchange event handlers.
 */
export interface ExchangeReactor {
  onExchangeRequest(event: ExchangeRequestEvent): void | Promise<void>;
  onExchangeResponse(event: ExchangeResponseEvent): void | Promise<void>;
}

/**
 * PartialExchangeReactor - Partial implementation
 */
export type PartialExchangeReactor = Partial<ExchangeReactor>;

// ===== Base Reactor =====

/**
 * Base Reactor type - any object with event handler methods
 */
export type Reactor = Record<string, any>;
