/**
 * Presentation Module
 *
 * UI-friendly data model and state management.
 */

export {
  type OS,
  Presentation,
  type PresentationOptions,
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
  ConnectionState,
  Conversation,
  ErrorConversation,
  FileBlock,
  FileTreeEntry,
  ImageBlock,
  OSState,
  PresentationMetrics,
  PresentationOS,
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
