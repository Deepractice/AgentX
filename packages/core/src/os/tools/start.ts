/**
 * Start Tool — Launch a background process in the OS
 *
 * For long-running processes like dev servers, watchers, etc.
 * Returns a process handle with pid for later management via sh("kill pid").
 */

import type { ToolDefinition } from "../../driver/types";
import type { AgentOS } from "../types";

export function createStartTool(os: AgentOS): ToolDefinition {
  return {
    name: "start",
    description:
      "Start a long-running background process (e.g. dev server, file watcher). " +
      "Returns the process pid. Use sh('kill <pid>') to stop it later, " +
      "or sh('ps') to check running processes.",
    parameters: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "Command to run in the background (e.g. 'npm run dev', 'node server.js')",
        },
        cwd: {
          type: "string",
          description: "Working directory relative to workspace root (optional)",
        },
      },
      required: ["command"],
    },
    execute: async (params) => {
      const handle = await os.sh.start(params.command as string, {
        cwd: params.cwd as string | undefined,
      });
      return { pid: handle.pid, command: handle.command };
    },
  };
}
