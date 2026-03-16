/**
 * Write Tool — Create or overwrite a file in workspace
 */

import type { ToolDefinition } from "../../driver/types";
import type { Workspace } from "../types";

export function createWriteTool(workspace: Workspace): ToolDefinition {
  return {
    name: "write",
    description:
      "Create a new file or overwrite an existing file. " +
      "Parent directories are created automatically.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File path relative to workspace root",
        },
        content: {
          type: "string",
          description: "Content to write to the file",
        },
      },
      required: ["path", "content"],
    },
    execute: async (params) => {
      await workspace.write(params.path as string, params.content as string);
      return { success: true };
    },
  };
}
