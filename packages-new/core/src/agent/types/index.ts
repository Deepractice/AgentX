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
 * - **Assistant**: AI participant (AssistantMessage, ToolCallMessage)
 * - **Tool**: Computer/execution environment (ToolResultMessage)
 *
 * @packageDocumentation
 */

// =============================================================================
// Message Types - Content Parts and Messages
// =============================================================================

export type {
  // Content Parts
  TextPart,
  ThinkingPart,
  ImagePart,
  FilePart,
  ToolCallPart,
  ToolResultOutput,
  ToolResultPart,
  ContentPart,
  UserContentPart,
  // Message Types
  MessageRole,
  MessageSubtype,
  TokenUsage,
  UserMessage,
  AssistantMessage,
  ToolCallMessage,
  ToolResultMessage,
  ErrorMessage,
  Message,
} from "./message";

// =============================================================================
// Event Types - Stream, State, Message, Turn Events
// =============================================================================

export type {
  // Base Types
  EngineEvent,
  AgentEvent,
  // Agent State and Error
  AgentState,
  AgentErrorCategory,
  AgentError,
  // Stream Events
  StopReason,
  MessageStartData,
  MessageDeltaData,
  MessageStopData,
  TextDeltaData,
  ToolUseStartData,
  InputJsonDeltaData,
  ToolUseStopData,
  ToolResultData,
  ErrorReceivedData,
  MessageStartEvent,
  MessageDeltaEvent,
  MessageStopEvent,
  TextDeltaEvent,
  ToolUseStartEvent,
  InputJsonDeltaEvent,
  ToolUseStopEvent,
  ToolResultEvent,
  ErrorReceivedEvent,
  StreamEvent,
  StreamEventType,
  // State Events
  ConversationQueuedData,
  ConversationStartData,
  ConversationThinkingData,
  ConversationRespondingData,
  ConversationEndData,
  ConversationInterruptedData,
  ToolPlannedData,
  ToolExecutingData,
  ToolCompletedData,
  ToolFailedData,
  ErrorOccurredData,
  StateEvent,
  ConversationQueuedEvent,
  ConversationStartEvent,
  ConversationThinkingEvent,
  ConversationRespondingEvent,
  ConversationEndEvent,
  ConversationInterruptedEvent,
  ToolPlannedEvent,
  ToolExecutingEvent,
  ToolCompletedEvent,
  ToolFailedEvent,
  ErrorOccurredEvent,
  AgentErrorOccurredEvent,
  AgentStateEvent,
  // Message Events
  MessageEvent,
  UserMessageEvent,
  AssistantMessageEvent,
  ToolCallMessageEvent,
  ToolResultMessageEvent,
  ErrorMessageEvent,
  AgentMessageEvent,
  // Turn Events
  TurnRequestData,
  TurnResponseData,
  TurnEvent,
  TurnRequestEvent,
  TurnResponseEvent,
  AgentTurnEvent,
  // Agent Output
  AgentOutput,
  // Event Handling
  Unsubscribe,
  AgentOutputCallback,
  AgentEventHandler,
} from "./event";

// Type guards (functions, not types)
export { isStateEvent, isMessageEvent, isTurnEvent } from "./event";

// =============================================================================
// Engine Types - Engine, Source, Presenter, Middleware, Interceptor
// =============================================================================

export type {
  // Message Queue
  MessageQueue,
  // Middleware & Interceptor
  AgentMiddlewareNext,
  AgentMiddleware,
  AgentInterceptorNext,
  AgentInterceptor,
  // State Machine
  StateChange,
  StateChangeHandler,
  AgentStateMachineInterface,
  // Event Handler Maps
  EventHandlerMap,
  ReactHandlerMap,
  // Agent Engine
  AgentEngine,
  // Source & Presenter (EventBus adapters)
  AgentSource,
  AgentPresenter,
  AgentEventBus,
  // Factory Options
  CreateAgentOptions,
} from "./engine";
