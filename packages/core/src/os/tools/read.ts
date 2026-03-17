/**
 * Read Tool — Read file content from the OS filesystem
 */

import type { ToolDefinition } from "../../driver/types";
import type { AgentOS } from "../types";

export function createReadTool(os: AgentOS): ToolDefinition {
  return {
    name: "read",
    description:
      "Read the contents of a file. " +
      "Supports reading specific line ranges with offset and limit.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File path (relative or absolute within the OS)",
        },
        offset: {
          type: "number",
          description: "Line number to start reading from (1-based, optional)",
        },
        limit: {
          type: "number",
          description: "Maximum number of lines to read (optional)",
        },
      },
      required: ["path"],
    },
    execute: async (params) => {
      const content = await os.fs.read(params.path as string, {
        offset: params.offset as number | undefined,
        limit: params.limit as number | undefined,
      });
      return content;
    },
  };
}
