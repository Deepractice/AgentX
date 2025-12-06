/**
 * MessagePane - Message display area component
 *
 * A pure UI component for displaying messages with:
 * - User and assistant message bubbles
 * - Streaming text indicator
 * - Auto-scroll to bottom
 * - Empty state
 * - Markdown rendering support
 *
 * This component knows nothing about business concepts.
 * It only deals with generic "messages" with role and content.
 *
 * @example
 * ```tsx
 * <MessagePane
 *   items={messages}
 *   streamingText="Currently typing..."
 *   renderContent={(content) => <Markdown>{content}</Markdown>}
 * />
 * ```
 */

import * as React from "react";
import { cn } from "~/utils/utils";
import { MarkdownText } from "~/components/typography/MarkdownText";
import { EmptyState } from "~/components/element/EmptyState";
import { MessageSquare } from "lucide-react";

/**
 * Message item data
 */
export interface MessagePaneItem {
  /**
   * Unique identifier
   */
  id: string;
  /**
   * Message role
   */
  role: "user" | "assistant" | "system" | "tool";
  /**
   * Message content (string for text, any for structured content)
   */
  content: string | unknown;
  /**
   * Timestamp
   */
  timestamp?: number;
  /**
   * Optional metadata (tool name, etc.)
   */
  metadata?: Record<string, unknown>;
}

export interface MessagePaneProps {
  /**
   * Messages to display
   */
  items: MessagePaneItem[];
  /**
   * Current streaming text (displays with typing indicator)
   */
  streamingText?: string;
  /**
   * Whether currently loading/thinking
   */
  isLoading?: boolean;
  /**
   * Custom content renderer
   * @default Uses MarkdownText for strings
   */
  renderContent?: (content: unknown, item: MessagePaneItem) => React.ReactNode;
  /**
   * Custom avatar renderer
   */
  renderAvatar?: (role: MessagePaneItem["role"]) => React.ReactNode;
  /**
   * Empty state configuration
   */
  emptyState?: {
    icon?: React.ReactNode;
    title: string;
    description?: string;
  };
  /**
   * Additional class name
   */
  className?: string;
}

/**
 * Default content renderer
 */
const defaultRenderContent = (content: unknown): React.ReactNode => {
  if (typeof content === "string") {
    return <MarkdownText>{content}</MarkdownText>;
  }
  // For non-string content, render as JSON
  return (
    <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto">
      {JSON.stringify(content, null, 2)}
    </pre>
  );
};

/**
 * Default avatar renderer
 */
const defaultRenderAvatar = (role: MessagePaneItem["role"]): React.ReactNode => {
  const avatarClasses = cn(
    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
  );

  switch (role) {
    case "user":
      return (
        <div className={cn(avatarClasses, "bg-primary text-primary-foreground")}>
          U
        </div>
      );
    case "assistant":
      return (
        <div className={cn(avatarClasses, "bg-secondary text-secondary-foreground")}>
          A
        </div>
      );
    case "system":
      return (
        <div className={cn(avatarClasses, "bg-muted text-muted-foreground")}>
          S
        </div>
      );
    case "tool":
      return (
        <div className={cn(avatarClasses, "bg-accent text-accent-foreground")}>
          T
        </div>
      );
    default:
      return null;
  }
};

/**
 * Single message component
 */
const MessageBubble = ({
  item,
  renderContent,
  renderAvatar,
}: {
  item: MessagePaneItem;
  renderContent: (content: unknown, item: MessagePaneItem) => React.ReactNode;
  renderAvatar: (role: MessagePaneItem["role"]) => React.ReactNode;
}) => {
  const isUser = item.role === "user";
  const isSystem = item.role === "system";
  const isTool = item.role === "tool";

  // System messages are centered
  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
          {typeof item.content === "string" ? item.content : "System message"}
        </div>
      </div>
    );
  }

  // Tool messages have special styling
  if (isTool) {
    return (
      <div className="flex gap-3 py-2">
        {renderAvatar(item.role)}
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground mb-1">
            {(item.metadata?.toolName as string) || "Tool"}
          </div>
          <div className="bg-muted/30 border border-border rounded-lg p-3 text-sm">
            {renderContent(item.content, item)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex gap-3 py-2",
        isUser && "flex-row-reverse"
      )}
    >
      {renderAvatar(item.role)}
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-2",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
      >
        <div className="text-sm">
          {renderContent(item.content, item)}
        </div>
      </div>
    </div>
  );
};

/**
 * Streaming text indicator
 */
const StreamingIndicator = ({
  text,
  renderAvatar,
}: {
  text: string;
  renderAvatar: (role: MessagePaneItem["role"]) => React.ReactNode;
}) => {
  return (
    <div className="flex gap-3 py-2">
      {renderAvatar("assistant")}
      <div className="max-w-[80%] rounded-lg px-4 py-2 bg-muted">
        <div className="text-sm">
          <MarkdownText>{text}</MarkdownText>
          <span className="inline-block w-2 h-4 bg-foreground/50 animate-pulse ml-0.5 align-middle" />
        </div>
      </div>
    </div>
  );
};

/**
 * Thinking indicator
 */
const ThinkingIndicator = ({
  renderAvatar,
}: {
  renderAvatar: (role: MessagePaneItem["role"]) => React.ReactNode;
}) => {
  return (
    <div className="flex gap-3 py-2">
      {renderAvatar("assistant")}
      <div className="rounded-lg px-4 py-2 bg-muted">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
};

/**
 * MessagePane component
 */
export const MessagePane = React.forwardRef<HTMLDivElement, MessagePaneProps>(
  (
    {
      items,
      streamingText,
      isLoading = false,
      renderContent = defaultRenderContent,
      renderAvatar = defaultRenderAvatar,
      emptyState = {
        icon: <MessageSquare className="w-6 h-6" />,
        title: "No messages yet",
        description: "Start the conversation by sending a message",
      },
      className,
    },
    ref
  ) => {
    const scrollRef = React.useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when messages change
    React.useEffect(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, [items, streamingText, isLoading]);

    const isEmpty = items.length === 0 && !streamingText && !isLoading;

    return (
      <div
        ref={ref}
        className={cn("flex flex-col h-full bg-background", className)}
      >
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-2"
        >
          {isEmpty ? (
            <div className="h-full flex items-center justify-center">
              <EmptyState
                icon={emptyState.icon}
                title={emptyState.title}
                description={emptyState.description}
              />
            </div>
          ) : (
            <>
              {items.map((item) => (
                <MessageBubble
                  key={item.id}
                  item={item}
                  renderContent={renderContent}
                  renderAvatar={renderAvatar}
                />
              ))}
              {streamingText && (
                <StreamingIndicator
                  text={streamingText}
                  renderAvatar={renderAvatar}
                />
              )}
              {isLoading && !streamingText && (
                <ThinkingIndicator renderAvatar={renderAvatar} />
              )}
            </>
          )}
        </div>
      </div>
    );
  }
);

MessagePane.displayName = "MessagePane";
