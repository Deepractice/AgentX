/**
 * Write Tool — Create or overwrite a file in the OS filesystem
 */

import type { ToolDefinition } from "../../driver/types";
import type { AgentOS } from "../types";

export function createWriteTool(os: AgentOS): ToolDefinition {
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
          description: "File path (relative or absolute within the OS)",
        },
        content: {
          type: "string",
          description: "Content to write to the file",
        },
      },
      required: ["path", "content"],
    },
    execute: async (params) => {
      await os.fs.write(params.path as string, params.content as string);
      return { success: true };
    },
  };
}
