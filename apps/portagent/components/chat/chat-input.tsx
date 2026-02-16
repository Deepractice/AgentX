"use client";

import { ArrowUpIcon } from "lucide-react";
import * as React from "react";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (disabled) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ignore key events during IME composition (e.g. Chinese/Japanese input)
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    // Auto-resize textarea
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  return (
    <div data-testid="prompt-input" className="px-4 pb-4 pt-2">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border bg-background shadow-sm">
          <textarea
            ref={textareaRef}
            placeholder="Type a message..."
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            rows={1}
            className="w-full resize-none bg-transparent px-4 pt-3 pb-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
            style={{ minHeight: "2.5rem", maxHeight: "10rem" }}
          />
          <div className="flex items-center justify-end px-3 pb-2">
            <button
              type="button"
              onClick={handleSend}
              disabled={disabled || !value.trim()}
              aria-label="Send message"
              className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground"
            >
              <ArrowUpIcon className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
