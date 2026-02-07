/**
 * Presentation Module
 *
 * UI-friendly data model and state management.
 */

export type {
  Block,
  TextBlock,
  ToolBlock,
  ImageBlock,
  TokenUsage,
  Conversation,
  UserConversation,
  AssistantConversation,
  ErrorConversation,
  PresentationState,
} from "./types";

export { initialPresentationState } from "./types";

export {
  presentationReducer,
  addUserConversation,
  createInitialState,
  messagesToConversations,
} from "./reducer";

export {
  Presentation,
  type PresentationOptions,
  type PresentationUpdateHandler,
  type PresentationErrorHandler,
} from "./Presentation";
