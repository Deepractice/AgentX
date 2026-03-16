/**
 * Presentation Module
 *
 * UI-friendly data model and state management.
 */

export {
  Presentation,
  type PresentationErrorHandler,
  type PresentationOptions,
  type PresentationUpdateHandler,
} from "./Presentation";
export {
  addUserConversation,
  createInitialState,
  messagesToConversations,
  presentationReducer,
} from "./reducer";
export type {
  AssistantConversation,
  Block,
  Conversation,
  ErrorConversation,
  FileBlock,
  ImageBlock,
  PresentationMetrics,
  PresentationState,
  SessionMetrics,
  TextBlock,
  ThinkingBlock,
  TokenUsage,
  ToolBlock,
  TurnMetrics,
  UserConversation,
} from "./types";
export { initialMetrics, initialPresentationState, initialSessionMetrics } from "./types";
