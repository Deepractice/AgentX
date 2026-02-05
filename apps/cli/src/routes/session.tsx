/**
 * Session View - Chat session interface
 */

import { useTerminalDimensions, useKeyboard } from "@opentui/solid";
import { createSignal, onMount, Show, For, createEffect } from "solid-js";
import { useTheme } from "../context/theme";
import { useAgentX } from "../context/agentx";
import { useRoute } from "../context/route";
import { useToast } from "../context/toast";
import { createLogger } from "commonxjs/logger";

const logger = createLogger("cli/session");

export interface SessionViewProps {
  sessionId: string;
}

export function SessionView(props: SessionViewProps) {
  const dimensions = useTerminalDimensions();
  const { theme } = useTheme();
  const agentx = useAgentX();
  const route = useRoute();
  const toast = useToast();

  const [input, setInput] = createSignal("");
  const [messages, setMessages] = createSignal<Array<{ role: string; content: string }>>([]);
  const [loading, setLoading] = createSignal(false);
  const [agentId, setAgentId] = createSignal<string | null>(null);
  const [streamingText, setStreamingText] = createSignal("");

  // Create agent on mount
  onMount(async () => {
    logger.info("SessionView mounted", { sessionId: props.sessionId });
    if (!agentx.client) {
      logger.warn("No agentx client");
      return;
    }

    try {
      // Get image by session ID
      logger.info("Fetching images...");
      const images = await agentx.client.images.list();
      const image = images.records.find((r) => r.sessionId === props.sessionId);

      if (!image) {
        logger.error("Session not found", { sessionId: props.sessionId });
        toast.error(new Error("Session not found"));
        route.back();
        return;
      }

      // Create agent
      logger.info("Creating agent...", { imageId: image.imageId });
      const result = await agentx.client.agents.create({ imageId: image.imageId });
      setAgentId(result.agentId);
      logger.info("Agent created", { agentId: result.agentId });

      // Subscribe to events
      agentx.client.on("text_delta", (event) => {
        const data = event.data as { text: string };
        setStreamingText((s) => s + data.text);
      });

      agentx.client.on("assistant_message", (event) => {
        const data = event.data as { content: string };
        logger.info("Assistant message received", { contentLength: data.content.length });
        setMessages((m) => [...m, { role: "assistant", content: data.content }]);
        setStreamingText("");
        setLoading(false);
      });
    } catch (err) {
      logger.error("Failed to initialize session", {
        error: err instanceof Error ? err.message : String(err),
      });
      toast.error(err);
    }
  });

  // Handle input
  useKeyboard((evt) => {
    if (loading()) return;

    if (evt.name === "return" && input().trim()) {
      sendMessage();
      evt.preventDefault();
    } else if (evt.name === "backspace") {
      setInput((s) => s.slice(0, -1));
      evt.preventDefault();
    } else if (evt.name.length === 1 && !evt.ctrl && !evt.meta) {
      // Single character input
      setInput((s) => s + evt.name);
      evt.preventDefault();
    } else if (evt.name === "space") {
      setInput((s) => s + " ");
      evt.preventDefault();
    }
  });

  async function sendMessage() {
    const content = input().trim();
    logger.info("sendMessage called", { content, hasClient: !!agentx.client, agentId: agentId() });
    if (!content || !agentx.client || !agentId()) return;

    setInput("");
    setMessages((m) => [...m, { role: "user", content }]);
    setLoading(true);
    setStreamingText("");

    try {
      logger.info("Sending message to agent...");
      await agentx.client.sessions.send(agentId()!, content);
      logger.info("Message sent");
    } catch (err) {
      logger.error("Failed to send message", {
        error: err instanceof Error ? err.message : String(err),
      });
      toast.error(err);
      setLoading(false);
    }
  }

  const visibleHeight = dimensions().height - 6; // Header + input area

  return (
    <box width={dimensions().width} height={dimensions().height} flexDirection="column">
      {/* Header */}
      <box padding={1} flexDirection="row" gap={2}>
        <text fg={theme().primary}>
          <strong>Chat</strong>
        </text>
        <text fg={theme().textMuted}>Session: {props.sessionId.slice(0, 8)}...</text>
        <text fg={theme().textMuted}>(Esc to go back)</text>
      </box>

      {/* Messages */}
      <box flexGrow={1} flexDirection="column" padding={1}>
        <For each={messages().slice(-Math.floor(visibleHeight / 2))}>
          {(msg) => (
            <box marginBottom={1}>
              <text fg={msg.role === "user" ? theme().primary : theme().text}>
                <strong>{msg.role === "user" ? "You" : "AI"}:</strong> {msg.content}
              </text>
            </box>
          )}
        </For>

        <Show when={streamingText()}>
          <box marginBottom={1}>
            <text fg={theme().text}>
              <strong>AI:</strong> {streamingText()}
              <span style={{ fg: theme().textMuted }}>▊</span>
            </text>
          </box>
        </Show>

        <Show when={loading() && !streamingText()}>
          <text fg={theme().textMuted}>Thinking...</text>
        </Show>
      </box>

      {/* Input */}
      <box padding={1} border borderColor={theme().border}>
        <text fg={theme().text}>
          <span style={{ fg: theme().primary }}>›</span> {input()}
          <span style={{ fg: theme().textMuted }}>▊</span>
        </text>
      </box>
    </box>
  );
}
