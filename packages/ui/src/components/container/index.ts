/**
 * Container Components - Business Logic Layer
 *
 * Integration layer that combines Pane (UI) with Hooks (logic).
 *
 * Architecture:
 * - Agent instance = one conversation (short-lived)
 * - Image = saved conversation snapshot (persistent)
 *
 * Components:
 * - ContainerView: Main layout (ImagePane + ChatPane)
 * - ImagePane: Saved conversations list (to be replaced by AgentList)
 * - ChatPane: Current conversation (to be replaced by Chat)
 *
 * Note: MessagePane and InputPane are now in pane/ layer.
 * This layer will be refactored to use pane/ components.
 */

// ContainerView - Main layout component
export { ContainerView } from "./ContainerView";
export type { ContainerViewProps } from "./ContainerView";

// ImagePane - Saved conversations list
export { ImagePane } from "./ImagePane";
export type { ImagePaneProps } from "./ImagePane";

// ChatPane - Current conversation
export { ChatPane } from "./ChatPane";
export type { ChatPaneProps } from "./ChatPane";

// Types
export type { ImageItem, ConversationState } from "./types";
