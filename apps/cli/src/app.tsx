/**
 * AgentX TUI Application
 *
 * Main entry point for the terminal UI.
 */

import { render, useKeyboard, useTerminalDimensions } from "@opentui/solid";
import { createLogger } from "commonxjs/logger";
import { createSignal, ErrorBoundary, Match, Switch } from "solid-js";
import { DialogNewSession } from "./component/dialog-new-session";
import { DialogSessionList } from "./component/dialog-session-list";
import { AgentXProvider, useAgentX } from "./context/agentx";
import { DialogProvider, useDialog } from "./context/dialog";
import { ExitProvider, useExit } from "./context/exit";
import { RouteProvider, useRoute } from "./context/route";
import { ThemeProvider, useTheme } from "./context/theme";
import { ToastProvider } from "./context/toast";
import { Home } from "./routes/home";
import { SessionView } from "./routes/session";

const logger = createLogger("cli/app");

export interface TuiOptions {
  serverUrl: string;
  theme?: string;
}

/**
 * Start the TUI application
 */
export function tui(options: TuiOptions): Promise<void> {
  return new Promise<void>((resolve) => {
    const onExit = () => {
      logger.info("Exiting TUI");
      // Restore terminal state before exit
      process.stdout.write("\x1b[?1000l"); // Disable mouse tracking
      process.stdout.write("\x1b[?1002l"); // Disable mouse button tracking
      process.stdout.write("\x1b[?1003l"); // Disable all mouse tracking
      process.stdout.write("\x1b[?1006l"); // Disable SGR mouse mode
      process.stdout.write("\x1b[?25h"); // Show cursor
      process.stdout.write("\x1b[?1049l"); // Restore main screen buffer
      resolve();
      process.exit(0);
    };

    render(
      () => (
        <ErrorBoundary fallback={(error) => <ErrorScreen error={error} />}>
          <ExitProvider onExit={onExit}>
            <ToastProvider>
              <RouteProvider>
                <AgentXProvider serverUrl={options.serverUrl}>
                  <ThemeProvider initialTheme={options.theme}>
                    <DialogProvider>
                      <App />
                    </DialogProvider>
                  </ThemeProvider>
                </AgentXProvider>
              </RouteProvider>
            </ToastProvider>
          </ExitProvider>
        </ErrorBoundary>
      ),
      {
        targetFps: 60,
        exitOnCtrlC: false,
      }
    );
  });
}

/**
 * Main App component
 */
function App() {
  const dimensions = useTerminalDimensions();
  const { theme } = useTheme();
  const exit = useExit();
  const route = useRoute();
  const dialog = useDialog();
  const agentx = useAgentX();
  const [lastKey, setLastKey] = createSignal("");

  useKeyboard((evt) => {
    // Show last key for debugging
    const keyStr = `${evt.ctrl ? "Ctrl+" : ""}${evt.meta ? "Meta+" : ""}${evt.name}`;
    setLastKey(keyStr);
    logger.debug("Key pressed", {
      key: keyStr,
      connected: agentx.connected(),
      dialogCount: dialog.stack.length,
    });

    // Ctrl+C to exit
    if (evt.ctrl && evt.name === "c") {
      logger.info("Exit requested");
      exit();
      return;
    }

    // Only handle shortcuts when connected
    if (!agentx.connected()) {
      logger.debug("Ignoring key - not connected");
      return;
    }

    // Skip if dialog is open
    if (dialog.stack.length > 0) {
      logger.debug("Ignoring key - dialog open");
      return;
    }

    // Ctrl+N - New session
    if (evt.ctrl && (evt.name === "n" || evt.name === "N")) {
      logger.info("Opening new session dialog");
      dialog.show(() => <DialogNewSession />);
      logger.info("dialog.show called", { stackLength: dialog.stack.length });
      evt.preventDefault();
      return;
    }

    // Ctrl+L - List sessions
    if (evt.ctrl && (evt.name === "l" || evt.name === "L")) {
      logger.info("Opening session list dialog");
      dialog.show(() => <DialogSessionList />);
      logger.info("dialog.show called", { stackLength: dialog.stack.length });
      evt.preventDefault();
      return;
    }

    // Escape - Go back
    if (evt.name === "escape" && route.data.type !== "home") {
      route.back();
      evt.preventDefault();
      return;
    }
  });

  return (
    <box
      width={dimensions().width}
      height={dimensions().height}
      backgroundColor={theme().background}
      flexDirection="column"
    >
      <box flexGrow={1}>
        <Switch>
          <Match when={route.data.type === "home"}>
            <Home />
          </Match>
          <Match when={route.data.type === "session"}>
            <SessionView sessionId={(route.data as { sessionId: string }).sessionId} />
          </Match>
        </Switch>
      </box>
      {/* Debug: show status */}
      <box position="absolute" bottom={0} right={2}>
        <text fg={theme().textMuted}>
          Key: {lastKey()} | Connected: {agentx.connected() ? "Y" : "N"} | Dialogs:{" "}
          {dialog.stack.length}
        </text>
      </box>
    </box>
  );
}

/**
 * Error screen
 */
function ErrorScreen(props: { error: Error }) {
  const dimensions = useTerminalDimensions();

  return (
    <box width={dimensions().width} height={dimensions().height} flexDirection="column" padding={2}>
      <text fg="#ff0000">Fatal Error:</text>
      <text fg="#ffffff">{props.error.message}</text>
      <text fg="#808080">{props.error.stack}</text>
    </box>
  );
}
