export { Chat } from "./Chat";
export type { ChatProps } from "./Chat";

export { ChatMessageList } from "./ChatMessageList";
export type { ChatMessageListProps } from "./ChatMessageList";

export { ChatInput } from "./ChatInput";
export type { ChatInputProps } from "./ChatInput";

export { StatusIndicator } from "./StatusIndicator";
export type { StatusIndicatorProps } from "./StatusIndicator";

// Re-export message components
export {
  UserMessage,
  AssistantMessage,
  ToolCallMessage,
  ToolResultMessage,
  SystemMessage,
  ErrorAlert,
} from "./messages";

export type {
  UserMessageProps,
  AssistantMessageProps,
  ToolCallMessageProps,
  ToolResultMessageProps,
  SystemMessageProps,
  ErrorAlertProps,
} from "./messages";

// Re-export Message type from agentx-types
export type { Message } from "@deepractice-ai/agentx-types";
