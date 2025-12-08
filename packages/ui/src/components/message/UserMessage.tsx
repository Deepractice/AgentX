/**
 * UserMessage - User message handler and component
 *
 * Handler: Processes messages with subtype "user"
 * Component: Displays user message with right-aligned layout
 */

import * as React from "react";
import type { Message, UserMessage as UserMessageType } from "agentxjs";
import { BaseMessageHandler } from "./MessageHandler";
import { MessageAvatar } from "./MessageAvatar";
import { MessageContent } from "./MessageContent";
import { cn } from "~/utils/utils";

// ============================================================================
// Component
// ============================================================================

export interface UserMessageProps {
  /**
   * User message data
   */
  message: UserMessageType;
  /**
   * Additional class name
   */
  className?: string;
}

/**
 * UserMessage Component
 */
export const UserMessage: React.FC<UserMessageProps> = ({ message, className }) => {
  return (
    <div className={cn("flex gap-3 py-2 flex-row-reverse", className)}>
      <MessageAvatar role="user" />
      <div className="max-w-[80%] rounded-lg px-4 py-2 bg-primary text-primary-foreground">
        <MessageContent content={message.content} className="text-sm" />
      </div>
    </div>
  );
};

// ============================================================================
// Handler
// ============================================================================

export class UserMessageHandler extends BaseMessageHandler {
  canHandle(message: Message): boolean {
    return message.subtype === "user";
  }

  protected renderMessage(message: Message): React.ReactNode {
    return <UserMessage message={message as UserMessageType} />;
  }
}
