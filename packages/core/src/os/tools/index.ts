/**
 * OS Tools — Generate ToolDefinition[] from an AgentOS instance.
 *
 * 5 tools: read, write, edit, sh, start
 */

import type { ToolDefinition } from "../../driver/types";
import type { AgentOS } from "../types";
import { createEditTool } from "./edit";
import { createReadTool } from "./read";
import { createShTool } from "./sh";
import { createStartTool } from "./start";
import { createWriteTool } from "./write";

/**
 * Create all OS tools from an AgentOS instance.
 *
 * @param os - The AgentOS instance to create tools for
 * @returns Array of 5 ToolDefinitions: read, write, edit, sh, start
 */
export function createOSTools(os: AgentOS): ToolDefinition[] {
  return [
    createReadTool(os),
    createWriteTool(os),
    createEditTool(os),
    createShTool(os),
    createStartTool(os),
  ];
}
