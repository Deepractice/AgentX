/**
 * ChatPane - Current conversation view
 *
 * Displays the active conversation with:
 * - Message list
 * - Streaming text
 * - Input box
 * - Status indicator
 */

import React, { useRef, useEffect } from "react";
import type { UIMessage, AgentStatus } from "~/hooks/useAgent";
import { cn } from "~/utils";

export interface ChatPaneProps {
  /**
   * Messages in the conversation
   */
  messages: UIMessage[];

  /**
   * Current streaming text
   */
  streaming?: string;

  /**
   * Agent status
   */
  status: AgentStatus;

  /**
   * Whether the agent is loading
   */
  isLoading?: boolean;

  /**
   * Send message callback
   */
  onSend?: (text: string) => void;

  /**
   * Interrupt callback
   */
  onInterrupt?: () => void;

  /**
   * Save conversation callback
   */
  onSave?: () => void;

  /**
   * Agent name (for display)
   */
  agentName?: string;

  /**
   * Additional class name
   */
  className?: string;
}

/**
 * Status indicator component
 */
function StatusIndicator({ status }: { status: AgentStatus }) {
  const statusConfig: Record<AgentStatus, { color: string; text: string }> = {
    idle: { color: "bg-gray-400", text: "Ready" },
    queued: { color: "bg-yellow-400 animate-pulse", text: "Queued" },
    thinking: { color: "bg-blue-400 animate-pulse", text: "Thinking..." },
    responding: { color: "bg-green-400 animate-pulse", text: "Responding..." },
    tool_executing: { color: "bg-purple-400 animate-pulse", text: "Executing tool..." },
    error: { color: "bg-red-400", text: "Error" },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
      <span className={cn("w-2 h-2 rounded-full", config.color)} />
      <span>{config.text}</span>
    </div>
  );
}

/**
 * Single message component
 */
function MessageItem({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const isToolCall = message.role === "tool_call";
  const isToolResult = message.role === "tool_result";

  return (
    <div
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-2",
          isUser
            ? "bg-blue-500 text-white"
            : isToolCall || isToolResult
            ? "bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            : "bg-gray-100 dark:bg-gray-800"
        )}
      >
        {isToolCall && (
          <div className="text-xs text-purple-600 dark:text-purple-400 mb-1 font-medium">
            Tool Call
          </div>
        )}
        {isToolResult && (
          <div className="text-xs text-green-600 dark:text-green-400 mb-1 font-medium">
            Tool Result
          </div>
        )}
        <div className="text-sm whitespace-pre-wrap">
          {typeof message.content === "string"
            ? message.content
            : JSON.stringify(message.content, null, 2)}
        </div>
      </div>
    </div>
  );
}

/**
 * Streaming text component
 */
function StreamingMessage({ text }: { text: string }) {
  if (!text) return null;

  return (
    <div className="flex w-full justify-start">
      <div className="max-w-[80%] rounded-lg px-4 py-2 bg-gray-100 dark:bg-gray-800">
        <div className="text-sm whitespace-pre-wrap">{text}</div>
        <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1" />
      </div>
    </div>
  );
}

/**
 * Input component
 */
function ChatInput({
  onSend,
  onInterrupt,
  isLoading,
  disabled,
}: {
  onSend: (text: string) => void;
  onInterrupt?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}) {
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
    <div className="flex items-end gap-2 p-3 border-t border-gray-200 dark:border-gray-700">
      <textarea
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
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
      {isLoading ? (
        <button
          onClick={onInterrupt}
          className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
        >
          Stop
        </button>
      ) : (
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
      )}
    </div>
  );
}

/**
 * Empty state component
 */
function EmptyState({ agentName }: { agentName?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
      <svg
        className="w-16 h-16 mb-4 opacity-50"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
      <p className="text-lg font-medium">
        {agentName ? `Chat with ${agentName}` : "Start a conversation"}
      </p>
      <p className="text-sm mt-1">Send a message to begin</p>
    </div>
  );
}

/**
 * ChatPane component
 */
export function ChatPane({
  messages,
  streaming,
  status,
  isLoading,
  onSend,
  onInterrupt,
  onSave,
  agentName,
  className,
}: ChatPaneProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const hasMessages = messages.length > 0 || !!streaming;

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {agentName || "Chat"}
          </h2>
          <StatusIndicator status={status} />
        </div>
        {onSave && hasMessages && (
          <button
            onClick={onSave}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Save conversation"
          >
            <svg
              className="w-4 h-4 text-gray-600 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {hasMessages ? (
          <>
            {messages.map((msg) => (
              <MessageItem key={msg.id} message={msg} />
            ))}
            {streaming && <StreamingMessage text={streaming} />}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <EmptyState agentName={agentName} />
        )}
      </div>

      {/* Input */}
      {onSend && (
        <ChatInput
          onSend={onSend}
          onInterrupt={onInterrupt}
          isLoading={isLoading}
          disabled={status === "error"}
        />
      )}
    </div>
  );
}
