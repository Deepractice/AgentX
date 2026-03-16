/**
 * List Tool — List directory contents
 */

import type { ToolDefinition } from "../../driver/types";
import type { Workspace } from "../types";

export function createListTool(workspace: Workspace): ToolDefinition {
  return {
    name: "list",
    description:
      "List the contents of a directory. " + "Returns file and directory names with their types.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Directory path relative to workspace root (default: root)",
        },
      },
    },
    execute: async (params) => {
      const entries = await workspace.list((params.path as string) ?? ".");
      return entries;
    },
  };
}
