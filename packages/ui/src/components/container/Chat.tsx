/**
 * Chat - Chat interface component
 *
 * Business component that combines MessagePane + InputPane with useAgent hook.
 * Displays messages and handles sending/receiving.
 *
 * Uses unified message state with reducer pattern:
 * - messages: completed messages (user, assistant, tool-call, error)
 * - pendingAssistant: current streaming assistant message
 * - streaming: accumulated streaming text
 *
 * @example
 * ```tsx
 * <Chat
 *   agentx={agentx}
 *   imageId={currentImageId}
 * />
 * ```
 */

import * as React from "react";
import type { AgentX } from "agentxjs";
import { Save, Smile, Paperclip, FolderOpen } from "lucide-react";
import { MessagePane, InputPane, type ToolBarItem } from "~/components/pane";
import { AssistantMessage } from "~/components/message/AssistantMessage";
import { ToolMessage } from "~/components/message/ToolMessage";
import { UserMessage } from "~/components/message/UserMessage";
import { ErrorMessage } from "~/components/message/ErrorMessage";
import {
  useAgent,
  type RenderMessage,
  type RenderUserMessage,
  type RenderAssistantMessage,
  type RenderToolCallMessage,
  type RenderErrorMessage,
} from "~/hooks";
import { cn } from "~/utils";
import { ChatHeader } from "./ChatHeader";

export interface ChatProps {
  /**
   * AgentX instance
   */
  agentx: AgentX | null;
  /**
   * Image ID for the conversation
   */
  imageId?: string | null;
  /**
   * Agent name to display in header
   */
  agentName?: string;
  /**
   * Callback when save button is clicked
   */
  onSave?: () => void;
  /**
   * Show save button in toolbar
   * @default false
   */
  showSaveButton?: boolean;
  /**
   * Input placeholder text
   */
  placeholder?: string;
  /**
   * Height ratio for input pane (0-1)
   * @default 0.25
   */
  inputHeightRatio?: number;
  /**
   * Additional class name
   */
  className?: string;
}

/**
 * Render a single message based on its type
 */
function renderMessage(message: RenderMessage): React.ReactNode {
  switch (message.subtype) {
    case "user": {
      const userMsg = message as RenderUserMessage;
      return <UserMessage key={message.id} content={userMsg.content} status={userMsg.status} />;
    }

    case "assistant": {
      const assistantMsg = message as RenderAssistantMessage;
      return (
        <AssistantMessage
          key={message.id}
          status={assistantMsg.status}
          content={assistantMsg.content}
        />
      );
    }

    case "tool-call": {
      const toolMsg = message as RenderToolCallMessage;
      return (
        <ToolMessage
          key={message.id}
          toolCall={toolMsg.toolCall}
          toolResult={toolMsg.toolResult}
          timestamp={toolMsg.timestamp}
        />
      );
    }

    case "error": {
      const errorMsg = message as RenderErrorMessage;
      return <ErrorMessage key={message.id} content={errorMsg.content} />;
    }

    default:
      return null;
  }
}

/**
 * Chat component
 */
export function Chat({
  agentx,
  imageId,
  agentName,
  onSave,
  showSaveButton = false,
  placeholder = "Type a message...",
  inputHeightRatio = 0.25,
  className,
}: ChatProps) {
  // Use unified message state
  const { messages, pendingAssistant, streaming, status, send, interrupt } = useAgent(
    agentx,
    imageId ?? null
  );

  // Determine loading state
  const isLoading =
    status === "thinking" ||
    status === "responding" ||
    status === "planning_tool" ||
    status === "awaiting_tool_result";

  // Toolbar items
  const toolbarItems: ToolBarItem[] = React.useMemo(
    () => [
      { id: "emoji", icon: <Smile className="w-4 h-4" />, label: "Emoji" },
      { id: "attach", icon: <Paperclip className="w-4 h-4" />, label: "Attach" },
      { id: "folder", icon: <FolderOpen className="w-4 h-4" />, label: "File" },
    ],
    []
  );

  const toolbarRightItems: ToolBarItem[] = React.useMemo(() => {
    if (!showSaveButton || !onSave) return [];
    return [{ id: "save", icon: <Save className="w-4 h-4" />, label: "Save conversation" }];
  }, [showSaveButton, onSave]);

  const handleToolbarClick = React.useCallback(
    (id: string) => {
      if (id === "save" && onSave) {
        onSave();
      }
    },
    [onSave]
  );

  // Calculate heights
  const inputHeight = `${Math.round(inputHeightRatio * 100)}%`;
  const messageHeight = `${Math.round((1 - inputHeightRatio) * 100)}%`;

  // Show empty state if no conversation selected
  if (!imageId) {
    return (
      <div className={cn("flex flex-col h-full bg-background", className)}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium mb-2">No conversation selected</p>
            <p className="text-sm">Select a conversation or start a new one</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header */}
      <ChatHeader agentName={agentName} status={status} messageCount={messages.length} />

      {/* Message area */}
      <div style={{ height: messageHeight }} className="min-h-0">
        <MessagePane>
          {/* Completed messages */}
          {messages.map((message) => renderMessage(message))}

          {/* Pending assistant (streaming) */}
          {pendingAssistant && (
            <AssistantMessage
              key="pending-assistant"
              status={pendingAssistant.status}
              streaming={streaming}
            />
          )}
        </MessagePane>
      </div>

      {/* Input area */}
      <div style={{ height: inputHeight }} className="min-h-0">
        <InputPane
          onSend={send}
          onStop={interrupt}
          isLoading={isLoading}
          placeholder={placeholder}
          toolbarItems={toolbarItems}
          toolbarRightItems={toolbarRightItems}
          onToolbarItemClick={handleToolbarClick}
        />
      </div>
    </div>
  );
}
