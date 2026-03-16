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
  TextBlock,
  ThinkingBlock,
  TokenUsage,
  ToolBlock,
  UserConversation,
} from "./types";
export { initialMetrics, initialPresentationState } from "./types";
