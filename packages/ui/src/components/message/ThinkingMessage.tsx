/**
 * ThinkingMessage - Display thinking indicator
 *
 * Features:
 * - Three animated bouncing dots
 * - Left-aligned with assistant avatar
 */

import * as React from "react";
import { MessageAvatar } from "./MessageAvatar";
import { cn } from "~/utils/utils";

export interface ThinkingMessageProps {
  /**
   * Additional class name
   */
  className?: string;
}

/**
 * ThinkingMessage Component
 */
export const ThinkingMessage: React.FC<ThinkingMessageProps> = ({ className }) => {
  return (
    <div className={cn("flex gap-3 py-2", className)}>
      <MessageAvatar role="assistant" />
      <div className="rounded-lg px-4 py-2 bg-muted">
        <div className="flex gap-1">
          <span
            className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
    </div>
  );
};
