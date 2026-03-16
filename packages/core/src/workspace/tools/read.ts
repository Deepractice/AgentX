/**
 * Read Tool — Read file content from workspace
 */

import type { ToolDefinition } from "../../driver/types";
import type { Workspace } from "../types";

export function createReadTool(workspace: Workspace): ToolDefinition {
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
          description: "File path relative to workspace root",
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
      const content = await workspace.read(params.path as string, {
        offset: params.offset as number | undefined,
        limit: params.limit as number | undefined,
      });
      return content;
    },
  };
}
