/**
 * InputPane - Simple input container
 *
 * Provides a text input area with send button.
 * For a full-featured chat experience, use ChatPane instead.
 */

import React, { useRef } from "react";
import { cn } from "~/utils";

export interface InputPaneProps {
  /**
   * Callback when user sends a message
   */
  onSend: (text: string) => void;

  /**
   * Whether input is disabled
   */
  disabled?: boolean;

  /**
   * Placeholder text
   */
  placeholder?: string;

  /**
   * Custom className
   */
  className?: string;
}

export function InputPane({
  onSend,
  disabled = false,
  placeholder = "Type a message...",
  className = "",
}: InputPaneProps) {
  const [text, setText] = React.useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn("flex items-end gap-2 p-3 border-t border-gray-200 dark:border-gray-700", className)}>
      <textarea
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-600",
          "px-3 py-2 text-sm bg-white dark:bg-gray-800",
          "focus:outline-none focus:ring-2 focus:ring-blue-500",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "min-h-[40px] max-h-[120px]"
        )}
        rows={1}
      />
      <button
        onClick={handleSend}
        disabled={!text.trim() || disabled}
        className={cn(
          "px-4 py-2 rounded-lg bg-blue-500 text-white transition-colors",
          "hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        Send
      </button>
    </div>
  );
}
