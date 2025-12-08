/**
 * StreamingMessage - Display streaming text with cursor
 *
 * Features:
 * - Animated cursor indicator
 * - Markdown rendering
 * - Left-aligned with assistant avatar
 */

import * as React from "react";
import { MessageAvatar } from "./MessageAvatar";
import { MarkdownText } from "~/components/typography/MarkdownText";
import { cn } from "~/utils/utils";

export interface StreamingMessageProps {
  /**
   * Streaming text content
   */
  text: string;
  /**
   * Additional class name
   */
  className?: string;
}

/**
 * StreamingMessage Component
 */
export const StreamingMessage: React.FC<StreamingMessageProps> = ({ text, className }) => {
  return (
    <div className={cn("flex gap-3 py-2", className)}>
      <MessageAvatar role="assistant" />
      <div className="max-w-[80%] rounded-lg px-4 py-2 bg-muted">
        <div className="text-sm">
          <MarkdownText>{text}</MarkdownText>
          <span className="inline-block w-2 h-4 bg-foreground/50 animate-pulse ml-0.5 align-middle" />
        </div>
      </div>
    </div>
  );
};
