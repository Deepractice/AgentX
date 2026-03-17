/**
 * Presentation Module
 *
 * UI-friendly data model and state management.
 */

export {
  Presentation,
  type PresentationOptions,
  type Workspace,
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
  PresentationMetrics,
  PresentationState,
  PresentationWorkspace,
  SessionMetrics,
  TextBlock,
  ThinkingBlock,
  TokenUsage,
  ToolBlock,
  TurnMetrics,
  UserConversation,
  WorkspaceState,
} from "./types";
export { initialMetrics, initialPresentationState, initialSessionMetrics } from "./types";
