/**
 * Dev server utilities for BDD testing
 *
 * Start and stop dev servers during test runs.
 */

import { type ChildProcess, spawn } from "node:child_process";
import { waitForUrl } from "./playwright";

export interface DevServerOptions {
  /** Working directory */
  cwd: string;
  /** Command to run (default: "bun") */
  command?: string;
  /** Command arguments (default: ["run", "dev"]) */
  args?: string[];
  /** Port to wait for */
  port: number;
  /** Startup timeout in ms (default: 30000) */
  timeout?: number;
  /** Show server output (default: false, or true if DEBUG env is set) */
  debug?: boolean;
}

let devServer: ChildProcess | null = null;

/**
 * Start a dev server and wait for it to be ready
 */
export async function startDevServer(options: DevServerOptions): Promise<void> {
  if (devServer) return;

  const {
    cwd,
    command = "bun",
    args = ["run", "dev"],
    port,
    timeout = 30000,
    debug = !!process.env.DEBUG,
  } = options;

  devServer = spawn(command, args, {
    cwd,
    stdio: "pipe",
    detached: false,
  });

  if (debug) {
    devServer.stdout?.on("data", (data) => {
      console.log("[dev-server]", data.toString());
    });

    devServer.stderr?.on("data", (data) => {
      console.error("[dev-server error]", data.toString());
    });
  }

  const url = `http://localhost:${port}`;
  const ready = await waitForUrl(url, timeout);

  if (!ready) {
    stopDevServer();
    throw new Error(`Dev server failed to start on port ${port}`);
  }
}

/**
 * Stop the dev server
 */
export function stopDevServer(): void {
  if (devServer) {
    devServer.kill("SIGTERM");
    devServer = null;
  }
}

/**
 * Get the dev server process (for advanced use)
 */
export function getDevServer(): ChildProcess | null {
  return devServer;
}
