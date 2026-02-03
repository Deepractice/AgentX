/**
 * New Session Dialog - Create a new chat session
 */

import { useKeyboard } from "@opentui/solid";
import { createSignal } from "solid-js";
import { useTheme } from "../context/theme";
import { useAgentX } from "../context/agentx";
import { useDialog } from "../context/dialog";
import { useRoute } from "../context/route";
import { useToast } from "../context/toast";
import { createLogger } from "commonxjs/logger";

const logger = createLogger("cli/dialog-new-session");

export function DialogNewSession() {
  const { theme } = useTheme();
  const agentx = useAgentX();
  const dialog = useDialog();
  const route = useRoute();
  const toast = useToast();

  const [creating, setCreating] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  async function createSession() {
    logger.info("createSession called", { hasClient: !!agentx.client, creating: creating() });
    if (!agentx.client || creating()) return;

    setCreating(true);
    setError(null);

    try {
      logger.info("Creating container...");
      await agentx.client.createContainer("default");

      logger.info("Creating image...");
      const result = await agentx.client.createImage({
        containerId: "default",
        name: `Chat ${new Date().toLocaleString()}`,
        systemPrompt: "You are a helpful assistant.",
      });

      logger.info("createImage response", { result: JSON.stringify(result) });

      if (!result.record?.sessionId) {
        throw new Error("Invalid response: missing sessionId");
      }

      logger.info("Session created", { sessionId: result.record.sessionId });
      dialog.clear();
      toast.show({ message: "Session created", variant: "success" });
      route.navigate({ type: "session", sessionId: result.record.sessionId });
    } catch (err) {
      logger.error("Failed to create session", {
        error: err instanceof Error ? err.message : String(err),
      });
      setError(err instanceof Error ? err.message : String(err));
      setCreating(false);
    }
  }

  // Auto-create on mount
  createSession();

  useKeyboard((evt) => {
    if (evt.name === "return" && error()) {
      // Retry
      createSession();
      evt.preventDefault();
    }
  });

  return (
    <box flexDirection="column" gap={1}>
      <text fg={theme().primary}>
        <strong>New Session</strong>
      </text>

      {creating() && !error() ? (
        <text fg={theme().textMuted}>Creating session...</text>
      ) : error() ? (
        <box flexDirection="column" gap={1}>
          <text fg={theme().error}>Error: {error()}</text>
          <text fg={theme().textMuted}>Press Enter to retry • Esc to cancel</text>
        </box>
      ) : null}
    </box>
  );
}
