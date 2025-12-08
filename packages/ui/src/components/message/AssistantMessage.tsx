/**
 * AssistantMessage - Assistant message handler and component
 *
 * Handler: Processes messages with subtype "assistant"
 * Component: Displays assistant message with left-aligned layout
 */

import * as React from "react";
import type { Message, AssistantMessage as AssistantMessageType } from "agentxjs";
import { BaseMessageHandler } from "./MessageHandler";
import { MessageAvatar } from "./MessageAvatar";
import { MessageContent } from "./MessageContent";
import { cn } from "~/utils/utils";

// ============================================================================
// Component
// ============================================================================

export interface AssistantMessageProps {
  /**
   * Assistant message data
   */
  message: AssistantMessageType;
  /**
   * Whether this is a streaming message (shows cursor)
   */
  isStreaming?: boolean;
  /**
   * Additional class name
   */
  className?: string;
}

/**
 * AssistantMessage Component
 */
export const AssistantMessage: React.FC<AssistantMessageProps> = ({
  message,
  isStreaming = false,
  className,
}) => {
  return (
    <div className={cn("flex gap-3 py-2", className)}>
      <MessageAvatar role="assistant" />
      <div className="max-w-[80%] rounded-lg px-4 py-2 bg-muted">
        <div className="text-sm">
          <MessageContent content={message.content} />
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-foreground/50 animate-pulse ml-0.5 align-middle" />
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Handler
// ============================================================================

export class AssistantMessageHandler extends BaseMessageHandler {
  canHandle(message: Message): boolean {
    return message.subtype === "assistant";
  }

  protected renderMessage(message: Message): React.ReactNode {
    return <AssistantMessage message={message as AssistantMessageType} />;
  }
}
