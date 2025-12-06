/**
 * MessagePane - Simple message display container
 *
 * Displays a list of messages with optional streaming text.
 * For a full-featured chat experience, use ChatPane instead.
 */

import { useRef, useEffect } from "react";
import type { UIMessage } from "~/hooks/useAgent";
import { cn } from "~/utils";

export interface MessagePaneProps {
  /**
   * Messages to display
   */
  messages: UIMessage[];

  /**
   * Current streaming text
   */
  streaming?: string;

  /**
   * Custom className
   */
  className?: string;
}

/**
 * Single message component
 */
function MessageItem({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-2",
          isUser
            ? "bg-blue-500 text-white"
            : "bg-gray-100 dark:bg-gray-800"
        )}
      >
        <div className="text-sm whitespace-pre-wrap">
          {typeof message.content === "string"
            ? message.content
            : JSON.stringify(message.content, null, 2)}
        </div>
      </div>
    </div>
  );
}

export function MessagePane({
  messages,
  streaming = "",
  className = "",
}: MessagePaneProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  return (
    <div className={cn("flex flex-col h-full overflow-y-auto p-4 space-y-3", className)}>
      {messages.map((msg) => (
        <MessageItem key={msg.id} message={msg} />
      ))}

      {/* Streaming text */}
      {streaming && (
        <div className="flex w-full justify-start">
          <div className="max-w-[80%] rounded-lg px-4 py-2 bg-gray-100 dark:bg-gray-800">
            <div className="text-sm whitespace-pre-wrap">{streaming}</div>
            <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1" />
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
