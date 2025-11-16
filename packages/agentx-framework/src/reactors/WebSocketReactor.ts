/**
 * WebSocketReactor - Server-side WebSocket event forwarder
 *
 * Implements all 4 reactor layers to forward Agent events to WebSocket clients.
 * Converts Agent events → WebSocket messages.
 */

import type {
  StreamReactor,
  StateReactor,
  MessageReactor,
  ExchangeReactor,
} from "@deepractice-ai/agentx-core";

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

/**
 * WebSocket-like interface for platform independence
 */
export interface WebSocketLike {
  send(data: string): void;
  readyState: number;
}

/**
 * WebSocketReactor - Forward all Agent events to WebSocket
 *
 * Implements all 4 reactor layers:
 * - StreamReactor: Real-time streaming deltas
 * - StateReactor: Lifecycle and state transitions
 * - MessageReactor: Complete messages
 * - ExchangeReactor: Analytics and cost tracking
 */
export class WebSocketReactor
  implements StreamReactor, StateReactor, MessageReactor, ExchangeReactor
{
  private ws: WebSocketLike;

  constructor(ws: WebSocketLike) {
    this.ws = ws;
  }

  /**
   * Send event to WebSocket client
   */
  private sendEvent(event: any): void {
    try {
      // Only send if WebSocket is open (readyState === 1)
      if (this.ws.readyState === 1) {
        this.ws.send(JSON.stringify(event));
      }
    } catch (error) {
      console.error("[WebSocketReactor] Failed to send event:", error);
    }
  }

  // ==================== Stream Layer ====================

  onMessageStart(event: MessageStartEvent): void {
    this.sendEvent(event);
  }

  onMessageDelta(event: MessageDeltaEvent): void {
    this.sendEvent(event);
  }

  onMessageStop(event: MessageStopEvent): void {
    this.sendEvent(event);
  }

  onTextContentBlockStart(event: TextContentBlockStartEvent): void {
    this.sendEvent(event);
  }

  onTextDelta(event: TextDeltaEvent): void {
    this.sendEvent(event);
  }

  onTextContentBlockStop(event: TextContentBlockStopEvent): void {
    this.sendEvent(event);
  }

  onToolUseContentBlockStart(event: ToolUseContentBlockStartEvent): void {
    this.sendEvent(event);
  }

  onInputJsonDelta(event: InputJsonDeltaEvent): void {
    this.sendEvent(event);
  }

  onToolUseContentBlockStop(event: ToolUseContentBlockStopEvent): void {
    this.sendEvent(event);
  }

  // ==================== State Layer ====================

  onAgentInitializing(event: AgentInitializingStateEvent): void {
    this.sendEvent(event);
  }

  onAgentReady(event: AgentReadyStateEvent): void {
    this.sendEvent(event);
  }

  onAgentDestroyed(event: AgentDestroyedStateEvent): void {
    this.sendEvent(event);
  }

  onConversationStart(event: ConversationStartStateEvent): void {
    this.sendEvent(event);
  }

  onConversationThinking(event: ConversationThinkingStateEvent): void {
    this.sendEvent(event);
  }

  onConversationResponding(event: ConversationRespondingStateEvent): void {
    this.sendEvent(event);
  }

  onConversationEnd(event: ConversationEndStateEvent): void {
    this.sendEvent(event);
  }

  onToolPlanned(event: ToolPlannedStateEvent): void {
    this.sendEvent(event);
  }

  onToolExecuting(event: ToolExecutingStateEvent): void {
    this.sendEvent(event);
  }

  onToolCompleted(event: ToolCompletedStateEvent): void {
    this.sendEvent(event);
  }

  onToolFailed(event: ToolFailedStateEvent): void {
    this.sendEvent(event);
  }

  onStreamStart(event: StreamStartStateEvent): void {
    this.sendEvent(event);
  }

  onStreamComplete(event: StreamCompleteStateEvent): void {
    this.sendEvent(event);
  }

  onErrorOccurred(event: ErrorOccurredStateEvent): void {
    this.sendEvent(event);
  }

  // ==================== Message Layer ====================

  onUserMessage(event: UserMessageEvent): void {
    this.sendEvent(event);
  }

  onAssistantMessage(event: AssistantMessageEvent): void {
    this.sendEvent(event);
  }

  onToolUseMessage(event: ToolUseMessageEvent): void {
    this.sendEvent(event);
  }

  onErrorMessage(event: ErrorMessageEvent): void {
    this.sendEvent(event);
  }

  // ==================== Exchange Layer ====================

  onExchangeRequest(event: ExchangeRequestEvent): void {
    this.sendEvent(event);
  }

  onExchangeResponse(event: ExchangeResponseEvent): void {
    this.sendEvent(event);
  }
}
