/**
 * useAgent - React hook for Agent event binding
 *
 * Binds to AgentX events for a specific agent and provides reactive state
 * for messages, streaming text, errors, and agent status.
 *
 * @example
 * ```tsx
 * import { useAgent } from "@agentxjs/ui";
 *
 * function ChatPage({ agentx, agentId }) {
 *   const {
 *     messages,
 *     streaming,
 *     status,
 *     errors,
 *     send,
 *     isLoading,
 *   } = useAgent(agentx, agentId);
 *
 *   return (
 *     <div>
 *       {messages.map(m => <Message key={m.id} {...m} />)}
 *       {streaming && <StreamingText text={streaming} />}
 *       <Input onSend={send} disabled={isLoading} />
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { AgentX, SystemEvent } from "agentxjs";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("ui/useAgent");

/**
 * Agent state for UI
 */
export type AgentStatus =
  | "idle"
  | "queued"
  | "thinking"
  | "responding"
  | "tool_executing"
  | "error";

/**
 * Message for UI display
 */
export interface UIMessage {
  id: string;
  role: "user" | "assistant" | "tool_call" | "tool_result";
  content: string | unknown;
  timestamp: number;
}

/**
 * Error info for UI
 */
export interface UIError {
  code: string;
  message: string;
  recoverable: boolean;
}

/**
 * Return type of useAgent hook
 */
export interface UseAgentResult {
  /**
   * All messages in the conversation
   */
  messages: UIMessage[];

  /**
   * Current streaming text (accumulates during response)
   */
  streaming: string;

  /**
   * Current agent status
   */
  status: AgentStatus;

  /**
   * Errors received
   */
  errors: UIError[];

  /**
   * Send a message to the agent
   */
  send: (text: string) => void;

  /**
   * Interrupt the current response
   */
  interrupt: () => void;

  /**
   * Whether the agent is currently processing
   */
  isLoading: boolean;

  /**
   * Clear all messages
   */
  clearMessages: () => void;

  /**
   * Clear all errors
   */
  clearErrors: () => void;
}

/**
 * Options for useAgent hook
 */
export interface UseAgentOptions {
  /**
   * Initial messages to display
   */
  initialMessages?: UIMessage[];

  /**
   * Callback when a message is sent
   */
  onSend?: (text: string) => void;

  /**
   * Callback when an error occurs
   */
  onError?: (error: UIError) => void;

  /**
   * Callback when status changes
   */
  onStatusChange?: (status: AgentStatus) => void;
}

/**
 * React hook for binding to Agent events via AgentX
 *
 * @param agentx - The AgentX instance
 * @param agentId - The agent ID to bind to
 * @param options - Optional configuration
 * @returns Reactive state and control functions
 */
export function useAgent(
  agentx: AgentX | null,
  agentId: string | null,
  options: UseAgentOptions = {}
): UseAgentResult {
  const { initialMessages = [], onSend, onError, onStatusChange } = options;

  // State
  const [messages, setMessages] = useState<UIMessage[]>(initialMessages);
  const [streaming, setStreaming] = useState("");
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [errors, setErrors] = useState<UIError[]>([]);

  // Track if component is mounted
  const mountedRef = useRef(true);

  // Derive isLoading from status
  const isLoading =
    status === "queued" ||
    status === "thinking" ||
    status === "responding" ||
    status === "tool_executing";

  // Reset state when agentId changes
  useEffect(() => {
    setMessages(initialMessages);
    setStreaming("");
    setErrors([]);
    setStatus("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  // Subscribe to agent events
  useEffect(() => {
    if (!agentx || !agentId) return;

    mountedRef.current = true;
    const unsubscribes: Array<() => void> = [];

    // Helper to check if event is for this agent
    const isForThisAgent = (event: SystemEvent): boolean => {
      return event.context?.agentId === agentId;
    };

    // Stream events - text_delta
    unsubscribes.push(
      agentx.on("text_delta", (event) => {
        if (!mountedRef.current || !isForThisAgent(event)) return;
        const data = event.data as { text: string };
        setStreaming((prev) => prev + data.text);
      })
    );

    // State events - conversation lifecycle
    unsubscribes.push(
      agentx.on("conversation_start", (event) => {
        if (!mountedRef.current || !isForThisAgent(event)) return;
        setStatus("thinking");
        onStatusChange?.("thinking");
      })
    );

    unsubscribes.push(
      agentx.on("conversation_thinking", (event) => {
        if (!mountedRef.current || !isForThisAgent(event)) return;
        setStatus("thinking");
        onStatusChange?.("thinking");
      })
    );

    unsubscribes.push(
      agentx.on("conversation_responding", (event) => {
        if (!mountedRef.current || !isForThisAgent(event)) return;
        setStatus("responding");
        onStatusChange?.("responding");
      })
    );

    unsubscribes.push(
      agentx.on("conversation_end", (event) => {
        if (!mountedRef.current || !isForThisAgent(event)) return;
        setStatus("idle");
        onStatusChange?.("idle");
      })
    );

    unsubscribes.push(
      agentx.on("tool_executing", (event) => {
        if (!mountedRef.current || !isForThisAgent(event)) return;
        setStatus("tool_executing");
        onStatusChange?.("tool_executing");
      })
    );

    // Message events - complete messages
    unsubscribes.push(
      agentx.on("assistant_message", (event) => {
        if (!mountedRef.current || !isForThisAgent(event)) return;
        const data = event.data as {
          messageId: string;
          content: unknown;
          timestamp: number;
        };
        setStreaming(""); // Clear streaming
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.messageId)) return prev;
          return [
            ...prev,
            {
              id: data.messageId,
              role: "assistant",
              content: data.content,
              timestamp: data.timestamp,
            },
          ];
        });
      })
    );

    unsubscribes.push(
      agentx.on("tool_call_message", (event) => {
        if (!mountedRef.current || !isForThisAgent(event)) return;
        const data = event.data as {
          messageId: string;
          toolCalls: unknown;
          timestamp: number;
        };
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.messageId)) return prev;
          return [
            ...prev,
            {
              id: data.messageId,
              role: "tool_call",
              content: data.toolCalls,
              timestamp: data.timestamp,
            },
          ];
        });
      })
    );

    unsubscribes.push(
      agentx.on("tool_result_message", (event) => {
        if (!mountedRef.current || !isForThisAgent(event)) return;
        const data = event.data as {
          messageId: string;
          results: unknown;
          timestamp: number;
        };
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.messageId)) return prev;
          return [
            ...prev,
            {
              id: data.messageId,
              role: "tool_result",
              content: data.results,
              timestamp: data.timestamp,
            },
          ];
        });
      })
    );

    // Error events
    unsubscribes.push(
      agentx.on("error_occurred", (event) => {
        if (!mountedRef.current || !isForThisAgent(event)) return;
        const data = event.data as UIError;
        setErrors((prev) => [...prev, data]);
        setStreaming(""); // Clear streaming on error
        setStatus("error");
        onError?.(data);
        onStatusChange?.("error");
      })
    );

    logger.debug("Subscribed to agent events", { agentId });

    return () => {
      mountedRef.current = false;
      unsubscribes.forEach((unsub) => unsub());
      logger.debug("Unsubscribed from agent events", { agentId });
    };
  }, [agentx, agentId, onError, onStatusChange]);

  // Send message
  const send = useCallback(
    (text: string) => {
      if (!agentx || !agentId) return;

      // Clear errors on new message
      setErrors([]);
      onSend?.(text);

      // Add user message to local state immediately
      const userMessage: UIMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        role: "user",
        content: text,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setStatus("queued");
      onStatusChange?.("queued");

      // Send to agent via request
      agentx
        .request("agent_receive_request", { agentId, content: text })
        .catch((error) => {
          logger.error("Failed to send message", { agentId, error });
          setStatus("error");
          onStatusChange?.("error");
        });
    },
    [agentx, agentId, onSend, onStatusChange]
  );

  // Interrupt
  const interrupt = useCallback(() => {
    if (!agentx || !agentId) return;

    agentx
      .request("agent_interrupt_request", { agentId })
      .catch((error) => {
        logger.error("Failed to interrupt agent", { agentId, error });
      });
  }, [agentx, agentId]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    setStreaming("");
  }, []);

  // Clear errors
  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  return {
    messages,
    streaming,
    status,
    errors,
    send,
    interrupt,
    isLoading,
    clearMessages,
    clearErrors,
  };
}
