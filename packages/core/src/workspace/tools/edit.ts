/**
 * Edit Tool — Replace exact string matches in a file
 */

import type { ToolDefinition } from "../../driver/types";
import type { Workspace } from "../types";

export function createEditTool(workspace: Workspace): ToolDefinition {
  return {
    name: "edit",
    description:
      "Replace an exact string match in a file. " +
      "The old_string must appear exactly once in the file (unless replace_all is true). " +
      "Use this for surgical edits instead of rewriting entire files.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File path relative to workspace root",
        },
        old_string: {
          type: "string",
          description: "The exact string to find and replace",
        },
        new_string: {
          type: "string",
          description: "The replacement string",
        },
        replace_all: {
          type: "boolean",
          description: "Replace all occurrences (default: false)",
        },
      },
      required: ["path", "old_string", "new_string"],
    },
    execute: async (params) => {
      const path = params.path as string;
      const oldString = params.old_string as string;
      const newString = params.new_string as string;
      const replaceAll = (params.replace_all as boolean) ?? false;

      const content = await workspace.read(path);

      if (!replaceAll) {
        // Ensure exactly one occurrence
        const firstIndex = content.indexOf(oldString);
        if (firstIndex === -1) {
          throw new Error(`old_string not found in ${path}`);
        }
        const secondIndex = content.indexOf(oldString, firstIndex + 1);
        if (secondIndex !== -1) {
          throw new Error(
            `old_string appears multiple times in ${path}. ` +
              "Provide more context to make it unique, or set replace_all to true."
          );
        }
      }

      const newContent = replaceAll
        ? content.replaceAll(oldString, newString)
        : content.replace(oldString, newString);

      await workspace.write(path, newContent);
      return { success: true };
    },
  };
}
