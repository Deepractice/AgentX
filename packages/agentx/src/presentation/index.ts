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
} from "./reducer";

export {
  Presentation,
  type PresentationOptions,
  type PresentationUpdateHandler,
  type PresentationErrorHandler,
} from "./Presentation";
