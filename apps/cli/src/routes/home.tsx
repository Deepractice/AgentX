/**
 * Home Screen - Welcome and connection status
 */

import { useTerminalDimensions } from "@opentui/solid";
import { Show } from "solid-js";
import { useAgentX } from "../context/agentx";
import { useTheme } from "../context/theme";

export function Home() {
  const dimensions = useTerminalDimensions();
  const { theme } = useTheme();
  const agentx = useAgentX();

  return (
    <box width={dimensions().width} height={dimensions().height} flexDirection="column" padding={2}>
      {/* Header */}
      <box flexDirection="row" gap={1}>
        <text fg={theme().primary}>
          <strong>AgentX</strong>
          <span style={{ fg: theme().textMuted }}> Terminal UI</span>
        </text>
      </box>

      {/* Connection Status */}
      <box marginTop={1}>
        <Show
          when={agentx.connected()}
          fallback={
            <Show when={agentx.error()} fallback={<text fg={theme().warning}>Connecting...</text>}>
              <text fg={theme().error}>Error: {agentx.error()}</text>
            </Show>
          }
        >
          <text fg={theme().success}>Connected to server</text>
        </Show>
      </box>

      {/* Instructions */}
      <box marginTop={2} flexDirection="column" gap={1}>
        <text fg={theme().textMuted}>Keyboard shortcuts:</text>
        <text fg={theme().text}> Ctrl+C Exit</text>
        <text fg={theme().text}> Ctrl+N New session</text>
        <text fg={theme().text}> Ctrl+L List sessions</text>
      </box>

      {/* Footer */}
      <box position="absolute" bottom={1} left={2}>
        <text fg={theme().textMuted}>Press Ctrl+C to exit</text>
      </box>
    </box>
  );
}
