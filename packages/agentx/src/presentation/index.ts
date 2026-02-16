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
  ImageBlock,
  PresentationState,
  TextBlock,
  TokenUsage,
  ToolBlock,
  UserConversation,
} from "./types";
export { initialPresentationState } from "./types";
