/**
 * Bash Tool Definition
 *
 * Creates a ToolDefinition that wraps a BashProvider.
 * The tool schema is sent to the LLM, the execute function
 * delegates to the platform-provided BashProvider via closure.
 */

import type { ToolDefinition } from "../driver/types";
import type { BashProvider } from "./types";

/**
 * Create a bash ToolDefinition from a BashProvider
 *
 * @param provider - Platform-provided BashProvider
 * @returns ToolDefinition ready for DriverConfig.tools
 *
 * @example
 * ```typescript
 * if (platform.bashProvider) {
 *   tools.push(createBashTool(platform.bashProvider));
 * }
 * ```
 */
export function createBashTool(provider: BashProvider): ToolDefinition {
  return {
    name: "bash",
    description:
      "Execute a shell command and return stdout, stderr, and exit code. " +
      "Use this for running CLI tools, scripts, file operations, etc.",
    parameters: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "Shell command to execute (e.g. 'ls -la', 'cat file.txt')",
        },
        cwd: {
          type: "string",
          description: "Working directory for the command (optional)",
        },
        timeout: {
          type: "number",
          description: "Timeout in milliseconds (optional, default 30000)",
        },
      },
      required: ["command"],
    },
    execute: async (params) => {
      const result = await provider.execute(params.command as string, {
        cwd: params.cwd as string | undefined,
        timeout: params.timeout as number | undefined,
      });
      return result;
    },
  };
}
