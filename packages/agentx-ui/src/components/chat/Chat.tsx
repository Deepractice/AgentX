/**
 * Chat - Pure UI component for chat interface
 *
 * A presentational component that renders the complete chat UI including:
 * - Message list with auto-scroll
 * - Status indicator (when loading)
 * - Error messages
 * - Input area
 *
 * @example
 * ```tsx
 * // Use with Agent component (recommended)
 * import { Agent, Chat } from "@deepractice-ai/agentx-ui";
 *
 * <Agent agent={agent}>
 *   {({ messages, streaming, errors, status, isLoading, send, interrupt }) => (
 *     <Chat
 *       messages={messages}
 *       streaming={streaming}
 *       errors={errors}
 *       status={status}
 *       isLoading={isLoading}
 *       onSend={send}
 *       onAbort={interrupt}
 *     />
 *   )}
 * </Agent>
 *
 * // Or use standalone with your own state management
 * <Chat
 *   messages={messages}
 *   streaming={streamingText}
 *   status="idle"
 *   isLoading={false}
 *   onSend={(text) => handleSend(text)}
 * />
 * ```
 */

import type { Message, AgentError, AgentState } from "@deepractice-ai/agentx-types";
import { ChatMessageList } from "./ChatMessageList";
import { ChatInput } from "./ChatInput";
import { StatusIndicator } from "./StatusIndicator";
import { ErrorAlert } from "./messages/ErrorAlert";

export interface ChatProps {
  /**
   * Messages to display
   */
  messages: Message[];

  /**
   * Current streaming text (accumulates during response)
   */
  streaming?: string;

  /**
   * Errors to display
   */
  errors?: AgentError[];

  /**
   * Current agent state (for status indicator)
   */
  status?: AgentState;

  /**
   * Whether the agent is currently processing (disables input, shows status)
   */
  isLoading?: boolean;

  /**
   * Callback when user sends a message
   */
  onSend: (text: string) => void;

  /**
   * Callback to abort/interrupt the current operation
   */
  onAbort?: () => void;

  /**
   * Custom className
   */
  className?: string;
}

export function Chat({
  messages,
  streaming = "",
  errors = [],
  status = "idle",
  isLoading = false,
  onSend,
  onAbort,
  className = "",
}: ChatProps) {
  return (
    <div className={`h-full flex flex-col bg-background ${className}`}>
      {/* Messages area */}
      <ChatMessageList messages={messages} streamingText={streaming} />

      {/* Status indicator (shows when loading) */}
      <div className="px-2 sm:px-4 md:px-4">
        <StatusIndicator status={status} isLoading={isLoading} onAbort={onAbort} />
      </div>

      {/* Error alerts (above input) */}
      {errors.length > 0 && (
        <div className="px-2 sm:px-4 md:px-4 pb-2 max-w-4xl mx-auto w-full space-y-2">
          {errors.map((error, index) => (
            <ErrorAlert key={`error-${index}`} error={error} showDetails={true} />
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="p-2 sm:p-4 md:p-4 flex-shrink-0 pb-2 sm:pb-4 md:pb-6">
        <div className="max-w-4xl mx-auto">
          <ChatInput onSend={onSend} disabled={isLoading} />
        </div>
      </div>
    </div>
  );
}
