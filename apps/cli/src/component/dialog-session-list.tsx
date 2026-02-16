/**
 * Session List Dialog - Shows available sessions
 */

import { useKeyboard, useTerminalDimensions } from "@opentui/solid";
import type { ImageRecord } from "agentxjs";
import { createSignal, For, onMount, Show } from "solid-js";
import { useAgentX } from "../context/agentx";
import { useDialog } from "../context/dialog";
import { useRoute } from "../context/route";
import { useTheme } from "../context/theme";

export function DialogSessionList() {
  const { theme } = useTheme();
  const agentx = useAgentX();
  const dialog = useDialog();
  const route = useRoute();
  const dimensions = useTerminalDimensions();

  const [sessions, setSessions] = createSignal<ImageRecord[]>([]);
  const [selected, setSelected] = createSignal(0);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  // Load sessions
  onMount(async () => {
    if (!agentx.client) return;

    try {
      const result = await agentx.client.images.list();
      setSessions(result.records);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  });

  // Keyboard navigation
  useKeyboard((evt) => {
    const list = sessions();
    if (list.length === 0) return;

    if (evt.name === "up" || evt.name === "k") {
      setSelected((s) => Math.max(0, s - 1));
      evt.preventDefault();
    } else if (evt.name === "down" || evt.name === "j") {
      setSelected((s) => Math.min(list.length - 1, s + 1));
      evt.preventDefault();
    } else if (evt.name === "return") {
      // Select session
      const session = list[selected()];
      if (session) {
        dialog.clear();
        route.navigate({ type: "session", sessionId: session.sessionId });
      }
      evt.preventDefault();
    }
  });

  const maxItems = Math.min(10, dimensions().height - 10);

  return (
    <box flexDirection="column" gap={1}>
      <text fg={theme().primary}>
        <strong>Sessions</strong>
      </text>

      <Show when={loading()}>
        <text fg={theme().textMuted}>Loading...</text>
      </Show>

      <Show when={error()}>
        <text fg={theme().error}>Error: {error()}</text>
      </Show>

      <Show when={!loading() && !error() && sessions().length === 0}>
        <text fg={theme().textMuted}>No sessions yet. Press Ctrl+N to create one.</text>
      </Show>

      <Show when={!loading() && sessions().length > 0}>
        <box flexDirection="column">
          <For each={sessions().slice(0, maxItems)}>
            {(session, index) => (
              <box flexDirection="row">
                <text fg={index() === selected() ? theme().primary : theme().text}>
                  {index() === selected() ? "› " : "  "}
                  {session.name || `Session ${session.imageId.slice(0, 8)}`}
                </text>
              </box>
            )}
          </For>
        </box>

        <box marginTop={1}>
          <text fg={theme().textMuted}>↑/↓ navigate • Enter select • Esc close</text>
        </box>
      </Show>
    </box>
  );
}
