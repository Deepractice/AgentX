/**
 * AgentX TUI Application
 *
 * Main entry point for the terminal UI.
 */

import { render, useTerminalDimensions, useKeyboard, useRenderer } from "@opentui/solid";
import { ErrorBoundary, createSignal } from "solid-js";
import { ThemeProvider, useTheme } from "./context/theme";
import { AgentXProvider, useAgentX } from "./context/agentx";
import { DialogProvider } from "./context/dialog";
import { ToastProvider } from "./context/toast";
import { RouteProvider, useRoute } from "./context/route";
import { ExitProvider, useExit } from "./context/exit";
import { Home } from "./routes/home";

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
      resolve();
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

  useKeyboard((evt) => {
    // Ctrl+C to exit
    if (evt.ctrl && evt.name === "c") {
      exit();
    }
  });

  return (
    <box
      width={dimensions().width}
      height={dimensions().height}
      backgroundColor={theme().background}
    >
      <Home />
    </box>
  );
}

/**
 * Error screen
 */
function ErrorScreen(props: { error: Error }) {
  const dimensions = useTerminalDimensions();

  return (
    <box
      width={dimensions().width}
      height={dimensions().height}
      flexDirection="column"
      padding={2}
    >
      <text fg="#ff0000">Fatal Error:</text>
      <text fg="#ffffff">{props.error.message}</text>
      <text fg="#808080">{props.error.stack}</text>
    </box>
  );
}
