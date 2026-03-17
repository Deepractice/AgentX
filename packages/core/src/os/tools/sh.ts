/**
 * Shell Tool — Execute commands in the OS shell
 *
 * Replaces the old "bash" tool. Handles everything:
 * ls, grep, find, ps, kill, npm, git, etc.
 */

import type { ToolDefinition } from "../../driver/types";
import type { AgentOS } from "../types";

export function createShTool(os: AgentOS): ToolDefinition {
  return {
    name: "sh",
    description:
      "Execute a shell command and return stdout, stderr, and exit code. " +
      "Use this for running CLI tools, scripts, package managers, git, " +
      "listing files, searching content, managing processes, and any other shell operation.",
    parameters: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "Shell command to execute (e.g. 'npm test', 'ls -la', 'grep -r TODO .')",
        },
        cwd: {
          type: "string",
          description: "Working directory relative to workspace root (optional)",
        },
        timeout: {
          type: "number",
          description: "Timeout in milliseconds (optional, default 30000)",
        },
      },
      required: ["command"],
    },
    execute: async (params) => {
      const result = await os.sh.exec(params.command as string, {
        cwd: params.cwd as string | undefined,
        timeout: params.timeout as number | undefined,
      });
      return result;
    },
  };
}
