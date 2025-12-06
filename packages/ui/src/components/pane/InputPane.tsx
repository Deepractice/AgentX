/**
 * InputPane - Input area with optional toolbar
 *
 * A pure UI component for text input with:
 * - Multi-line textarea
 * - Optional toolbar for actions
 * - Send button
 * - Loading/disabled states
 *
 * @example
 * ```tsx
 * <InputPane
 *   onSend={(text) => handleSend(text)}
 *   placeholder="Type a message..."
 *   toolbarItems={[
 *     { id: 'attach', icon: <Paperclip />, label: 'Attach' },
 *   ]}
 * />
 * ```
 */

import * as React from "react";
import { Send, Square } from "lucide-react";
import { cn } from "~/utils/utils";
import { InputToolBar, type ToolBarItem } from "./InputToolBar";

export interface InputPaneProps {
  /**
   * Callback when user sends a message
   */
  onSend?: (text: string) => void;
  /**
   * Callback when stop button is clicked (during loading)
   */
  onStop?: () => void;
  /**
   * Whether the input is disabled
   */
  disabled?: boolean;
  /**
   * Whether currently loading/processing
   */
  isLoading?: boolean;
  /**
   * Placeholder text
   */
  placeholder?: string;
  /**
   * Toolbar items (left side)
   */
  toolbarItems?: ToolBarItem[];
  /**
   * Toolbar items (right side)
   */
  toolbarRightItems?: ToolBarItem[];
  /**
   * Callback when a toolbar item is clicked
   */
  onToolbarItemClick?: (id: string) => void;
  /**
   * Show toolbar
   * @default true when toolbarItems provided
   */
  showToolbar?: boolean;
  /**
   * Minimum height of textarea
   * @default 60
   */
  minHeight?: number;
  /**
   * Maximum height of textarea (auto-grows up to this)
   * @default 200
   */
  maxHeight?: number;
  /**
   * Additional class name
   */
  className?: string;
}

/**
 * InputPane component
 */
export const InputPane = React.forwardRef<HTMLDivElement, InputPaneProps>(
  (
    {
      onSend,
      onStop,
      disabled = false,
      isLoading = false,
      placeholder = "Type a message...",
      toolbarItems,
      toolbarRightItems,
      onToolbarItemClick,
      showToolbar,
      minHeight = 60,
      maxHeight = 200,
      className,
    },
    ref
  ) => {
    const [text, setText] = React.useState("");
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    React.useEffect(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      // Reset height to recalculate
      textarea.style.height = "auto";
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = `${Math.min(Math.max(scrollHeight, minHeight), maxHeight)}px`;
    }, [text, minHeight, maxHeight]);

    const handleSend = () => {
      if (!text.trim() || disabled || isLoading) return;
      onSend?.(text.trim());
      setText("");

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = `${minHeight}px`;
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter to send, Shift+Enter for new line
      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        handleSend();
      }
    };

    const shouldShowToolbar =
      showToolbar ?? (toolbarItems && toolbarItems.length > 0);

    const canSend = text.trim().length > 0 && !disabled && !isLoading;

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col border-t border-border bg-background",
          className
        )}
      >
        {/* Toolbar */}
        {shouldShowToolbar && (
          <InputToolBar
            items={toolbarItems || []}
            rightItems={toolbarRightItems}
            onItemClick={onToolbarItemClick}
            className="border-b border-border"
          />
        )}

        {/* Input area */}
        <div className="flex items-end gap-2 p-3">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "flex-1 resize-none rounded-lg border border-input bg-background",
              "px-3 py-2 text-sm",
              "placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "overflow-y-auto"
            )}
            style={{
              minHeight: `${minHeight}px`,
              maxHeight: `${maxHeight}px`,
            }}
          />

          {/* Send/Stop button */}
          {isLoading && onStop ? (
            <button
              type="button"
              onClick={onStop}
              className={cn(
                "flex-shrink-0 p-2 rounded-lg transition-colors",
                "bg-destructive text-destructive-foreground",
                "hover:bg-destructive/90"
              )}
              title="Stop"
            >
              <Square className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className={cn(
                "flex-shrink-0 p-2 rounded-lg transition-colors",
                "bg-primary text-primary-foreground",
                "hover:bg-primary/90",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              title="Send (Enter)"
            >
              <Send className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    );
  }
);

InputPane.displayName = "InputPane";
