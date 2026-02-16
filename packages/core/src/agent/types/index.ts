/**
 * Agent Types - Single Source of Truth
 *
 * AgentEngine is an independent event processing unit that can be tested
 * in isolation without Runtime dependencies (Container, Session, Bus).
 *
 * ## Two-Domain Architecture
 *
 * ```
 * +-------------------------------------------------------------+
 * |  Runtime Domain (@agentxjs/types/runtime)                   |
 * |    - SystemEvent (source, category, intent, context)        |
 * |    - Container, Session, Sandbox, Environment               |
 * |    - Agent (complete runtime entity with lifecycle)         |
 * |                                                             |
 * |   +-----------------------------------------------------+   |
 * |   |  AgentEngine Domain (@agentxjs/types/agent)         |   |
 * |   |    - AgentEvent (lightweight: type, timestamp, data) |   |
 * |   |    - AgentEngine (event processing unit)            |   |
 * |   |    - Independent, testable in isolation             |   |
 * |   |                                                     |   |
 * |   |  Source <-- AgentEngine --> Presenter               |   |
 * |   |    ^            |               |                   |   |
 * |   +----|-----------|--------------|-+-------------------+   |
 * |        |            |               |                       |
 * |   DriveableEvent    |          SystemEvent                  |
 * |   -> StreamEvent    |          (add context)                |
 * +---------------------|-----------------------------------------+
 *                       |
 *                  MealyMachine
 *                  (pure event processor)
 * ```
 *
 * ## Core Components
 *
 * - **AgentEngine**: Event processing unit (Source + MealyMachine + Presenter)
 * - **AgentSource**: Input source - produces StreamEvent from external world
 * - **AgentPresenter**: Output adapter - emits AgentOutput to external systems
 * - **MealyMachine**: Pure Mealy Machine that transforms StreamEvent -> AgentOutput
 *
 * ## Event Layers (AgentOutput)
 *
 * 1. **StreamEvent**: Real-time incremental events (text_delta, tool_use_start...)
 * 2. **AgentStateEvent**: Events that affect AgentState (conversation_*, tool_*, error_*)
 * 3. **AgentMessageEvent**: Assembled messages (user_message, assistant_message...)
 * 4. **AgentTurnEvent**: Turn analytics (turn_request, turn_response)
 *
 * ## Message Types (Three-Party Model)
 *
 * - **User**: Human participant (UserMessage)
 * - **Assistant**: AI participant (AssistantMessage — content includes ToolCallPart)
 * - **Tool**: Computer/execution environment (ToolResultMessage)
 *
 * @packageDocumentation
 */

// =============================================================================
// Message Types - Content Parts and Messages
// =============================================================================

export type {
  AssistantMessage,
  ContentPart,
  ErrorMessage,
  FilePart,
  ImagePart,
  Message,
  // Message Types
  MessageRole,
  MessageSubtype,
  // Content Parts
  TextPart,
  ThinkingPart,
  TokenUsage,
  ToolCallPart,
  ToolResultMessage,
  ToolResultOutput,
  ToolResultPart,
  UserContentPart,
  UserMessage,
} from "./message";

// =============================================================================
// Event Types - Stream, State, Message, Turn Events
// =============================================================================

export type {
  AgentError,
  AgentErrorCategory,
  AgentErrorOccurredEvent,
  AgentEvent,
  AgentEventHandler,
  AgentMessageEvent,
  // Agent Output
  AgentOutput,
  AgentOutputCallback,
  // Agent State and Error
  AgentState,
  AgentStateEvent,
  AgentTurnEvent,
  AssistantMessageEvent,
  ConversationEndData,
  ConversationEndEvent,
  ConversationInterruptedData,
  ConversationInterruptedEvent,
  // State Events
  ConversationQueuedData,
  ConversationQueuedEvent,
  ConversationRespondingData,
  ConversationRespondingEvent,
  ConversationStartData,
  ConversationStartEvent,
  ConversationThinkingData,
  ConversationThinkingEvent,
  // Base Types
  EngineEvent,
  ErrorMessageEvent,
  ErrorOccurredData,
  ErrorOccurredEvent,
  ErrorReceivedData,
  ErrorReceivedEvent,
  InputJsonDeltaData,
  InputJsonDeltaEvent,
  MessageDeltaData,
  MessageDeltaEvent,
  // Message Events
  MessageEvent,
  MessageStartData,
  MessageStartEvent,
  MessageStopData,
  MessageStopEvent,
  StateEvent,
  // Stream Events
  StopReason,
  StreamEvent,
  StreamEventType,
  TextDeltaData,
  TextDeltaEvent,
  ToolCompletedData,
  ToolCompletedEvent,
  ToolExecutingData,
  ToolExecutingEvent,
  ToolFailedData,
  ToolFailedEvent,
  ToolPlannedData,
  ToolPlannedEvent,
  ToolResultData,
  ToolResultEvent,
  ToolResultMessageEvent,
  ToolUseStartData,
  ToolUseStartEvent,
  ToolUseStopData,
  ToolUseStopEvent,
  TurnEvent,
  // Turn Events
  TurnRequestData,
  TurnRequestEvent,
  TurnResponseData,
  TurnResponseEvent,
  // Event Handling
  Unsubscribe,
  UserMessageEvent,
} from "./event";

// Type guards (functions, not types)
export { isMessageEvent, isStateEvent, isTurnEvent } from "./event";

// =============================================================================
// Engine Types - Engine, Source, Presenter, Middleware, Interceptor
// =============================================================================

export type {
  // Agent Engine
  AgentEngine,
  AgentEventBus,
  AgentInterceptor,
  AgentInterceptorNext,
  AgentMiddleware,
  // Middleware & Interceptor
  AgentMiddlewareNext,
  AgentPresenter,
  // Source & Presenter (EventBus adapters)
  AgentSource,
  AgentStateMachineInterface,
  // Factory Options
  CreateAgentOptions,
  // Event Handler Maps
  EventHandlerMap,
  // Message Queue
  MessageQueue,
  ReactHandlerMap,
  // State Machine
  StateChange,
  StateChangeHandler,
} from "./engine";
