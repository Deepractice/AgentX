/**
 * Container Components
 *
 * New architecture:
 * - Agent instance = one conversation (short-lived)
 * - Image = saved conversation snapshot (persistent)
 *
 * Components:
 * - ContainerView: Main layout (ImagePane + ChatPane)
 * - ImagePane: Saved conversations list
 * - ChatPane: Current conversation
 * - MessagePane: Message display
 * - InputPane: User input
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

// MessagePane - Message display
export { MessagePane } from "./MessagePane";
export type { MessagePaneProps } from "./MessagePane";

// InputPane - User input
export { InputPane } from "./InputPane";
export type { InputPaneProps } from "./InputPane";

// Types
export type { ImageItem, ConversationState } from "./types";
