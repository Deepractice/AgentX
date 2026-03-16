/**
 * Glob Tool — Find files matching a glob pattern
 */

import type { ToolDefinition } from "../../driver/types";
import type { Workspace } from "../types";
import { isSearchable } from "../types";

export function createGlobTool(workspace: Workspace): ToolDefinition {
  return {
    name: "glob",
    description:
      "Find files matching a glob pattern. " +
      "Returns a list of file paths relative to the workspace root.",
    parameters: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "Glob pattern (e.g. 'src/*.ts', '*.json')",
        },
        cwd: {
          type: "string",
          description: "Subdirectory to search in (relative to workspace root)",
        },
      },
      required: ["pattern"],
    },
    execute: async (params) => {
      if (!isSearchable(workspace)) {
        throw new Error("This workspace does not support glob");
      }
      const files = await workspace.glob(params.pattern as string, {
        cwd: params.cwd as string | undefined,
      });
      return files;
    },
  };
}
