/**
 * Grep Tool — Search file contents by regex pattern
 */

import type { ToolDefinition } from "../../driver/types";
import type { Workspace } from "../types";
import { isSearchable } from "../types";

export function createGrepTool(workspace: Workspace): ToolDefinition {
  return {
    name: "grep",
    description:
      "Search file contents by regular expression pattern. " +
      "Returns matching lines with file path and line number.",
    parameters: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "Regular expression pattern to search for",
        },
        glob: {
          type: "string",
          description: "Glob pattern to filter files (e.g. '*.ts')",
        },
        max_results: {
          type: "number",
          description: "Maximum number of results (default: 100)",
        },
        ignore_case: {
          type: "boolean",
          description: "Case insensitive search (default: false)",
        },
      },
      required: ["pattern"],
    },
    execute: async (params) => {
      if (!isSearchable(workspace)) {
        throw new Error("This workspace does not support grep");
      }
      const matches = await workspace.grep(params.pattern as string, {
        glob: params.glob as string | undefined,
        maxResults: params.max_results as number | undefined,
        ignoreCase: params.ignore_case as boolean | undefined,
      });
      return matches;
    },
  };
}
