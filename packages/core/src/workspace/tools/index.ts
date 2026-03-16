/**
 * Workspace Tools
 *
 * Creates ToolDefinition[] from a Workspace instance.
 * Tools are injected into the Driver for LLM tool calling.
 *
 * Basic tools (read, write, edit, list) work with any Workspace.
 * Search tools (grep, glob) require SearchableWorkspace.
 */

import type { ToolDefinition } from "../../driver/types";
import type { Workspace } from "../types";
import { isSearchable } from "../types";
import { createEditTool } from "./edit";
import { createGlobTool } from "./glob";
import { createGrepTool } from "./grep";
import { createListTool } from "./list";
import { createReadTool } from "./read";
import { createWriteTool } from "./write";

/**
 * Create all workspace tools from a Workspace instance.
 *
 * Returns 4 basic tools for any Workspace, or 6 tools for SearchableWorkspace.
 */
export function createWorkspaceTools(workspace: Workspace): ToolDefinition[] {
  const tools: ToolDefinition[] = [
    createReadTool(workspace),
    createWriteTool(workspace),
    createEditTool(workspace),
    createListTool(workspace),
  ];

  if (isSearchable(workspace)) {
    tools.push(createGrepTool(workspace), createGlobTool(workspace));
  }

  return tools;
}

export { createEditTool } from "./edit";
export { createGlobTool } from "./glob";
export { createGrepTool } from "./grep";
export { createListTool } from "./list";
export { createReadTool } from "./read";
export { createWriteTool } from "./write";
